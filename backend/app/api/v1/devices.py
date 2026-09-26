import datetime as dt

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.security import (
    decode_qr_access_token,
    generate_device_api_key,
    hash_api_key,
    verify_api_key,
)
from app.db.session import get_db
from app.models.academic import Commission, ScheduleSlot, Subject
from app.models.attendance import Attendance, AttendanceStatus
from app.models.device import Device
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.profiles import StudentProfile
from app.models.scan_log import ScanLog, ScanResult, UsedQrToken
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceCreateOut, ScanRequest, ScanResponseOut
from app.services.schedule import today_as_dayofweek

router = APIRouter(tags=["devices"])

# Tolerancia para marcar "tarde" en vez de "presente": si el estudiante
# escanea hasta 15 minutos después del inicio de la clase, cuenta como
# presente igual; pasado eso (pero todavía dentro del horario), tarde.
TOLERANCIA_PRESENTE_MINUTOS = 15


@router.post("/devices/register", response_model=DeviceCreateOut)
def register_device(
    device_in: DeviceCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Registra una Raspberry Pi nueva, vinculada a un aula. La API key se
    devuelve en texto plano SOLO en esta respuesta; después no se puede
    volver a ver, solo regenerar."""
    plain_api_key = generate_device_api_key()
    device = Device(
        nombre=device_in.nombre,
        classroom_id=device_in.classroom_id,
        api_key_hash=hash_api_key(plain_api_key),
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    return DeviceCreateOut(
        id=device.id,
        nombre=device.nombre,
        classroom_id=device.classroom_id,
        is_active=device.is_active,
        api_key=plain_api_key,
    )


def get_current_device(
    x_device_id: str = Header(..., alias="X-Device-Id"),
    x_device_api_key: str = Header(..., alias="X-Device-Api-Key"),
    db: Session = Depends(get_db),
) -> Device:
    device = db.query(Device).filter(Device.id == x_device_id, Device.is_active == True).first()  # noqa: E712
    if device is None or not verify_api_key(x_device_api_key, device.api_key_hash):
        raise HTTPException(status_code=401, detail="Dispositivo no autorizado")
    return device


@router.post("/devices/scan", response_model=ScanResponseOut)
def scan(
    scan_in: ScanRequest,
    db: Session = Depends(get_db),
    device: Device = Depends(get_current_device),
):
    """La Raspberry Pi manda acá el token que decodificó de la cámara.
    Valida token + anti-replay + que el estudiante tenga esa clase en esa
    aula en este momento, y (Etapa 6) registra la asistencia real."""
    now = dt.datetime.now()

    def log_and_respond(result: ScanResult, mensaje: str, student_profile_id=None, **extra) -> ScanResponseOut:
        db.add(
            ScanLog(
                device_id=device.id,
                classroom_id=device.classroom_id,
                student_profile_id=student_profile_id,
                result=result,
            )
        )
        db.commit()
        return ScanResponseOut(result=result, mensaje=mensaje, **extra)

    payload = decode_qr_access_token(scan_in.token)
    if payload is None:
        return log_and_respond(ScanResult.INVALID_TOKEN, "Token inválido o vencido.")

    jti = payload.get("jti")
    if db.query(UsedQrToken).filter(UsedQrToken.jti == jti).first() is not None:
        return log_and_respond(ScanResult.REPLAY, "Este token ya fue utilizado.")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    student_profile = (
        db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first() if user else None
    )
    if student_profile is None:
        return log_and_respond(ScanResult.UNKNOWN_STUDENT, "No se encontró el perfil del estudiante.")

    # A partir de acá el token es válido para un estudiante real: lo marcamos usado.
    db.add(UsedQrToken(jti=jti))

    today = today_as_dayofweek(now)
    rows = (
        db.query(ScheduleSlot, Commission, Subject)
        .join(Commission, ScheduleSlot.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .join(Enrollment, Enrollment.commission_id == Commission.id)
        .filter(Enrollment.student_profile_id == student_profile.id)
        .filter(Enrollment.estado == EnrollmentStatus.CURSANDO)
        .filter(ScheduleSlot.dia == today)
        .all()
    )

    current_time = now.time()
    match, other_now = None, None
    for slot, commission, subject in rows:
        if slot.hora_inicio <= current_time <= slot.hora_fin:
            if slot.classroom_id == device.classroom_id:
                match = (slot, commission, subject)
                break
            other_now = (slot, commission, subject)

    if match:
        slot, commission, subject = match

        # ¿Ya había un registro de asistencia para hoy en esta comisión?
        # (evita duplicar si el estudiante escanea 2 veces seguidas)
        existing = (
            db.query(Attendance)
            .filter(
                Attendance.student_profile_id == student_profile.id,
                Attendance.commission_id == commission.id,
                Attendance.fecha == now.date(),
            )
            .first()
        )

        if existing:
            return log_and_respond(
                ScanResult.OK,
                "Ya tenías la asistencia registrada hoy para esta clase.",
                student_profile_id=student_profile.id,
                materia=subject.nombre,
                asistencia_registrada=True,
                estado_asistencia=existing.estado.value,
            )

        # Calcular si llegó a tiempo o tarde, según cuánto pasó desde hora_inicio
        minutos_tarde = (
            dt.datetime.combine(now.date(), current_time)
            - dt.datetime.combine(now.date(), slot.hora_inicio)
        ).total_seconds() / 60
        estado = (
            AttendanceStatus.PRESENTE if minutos_tarde <= TOLERANCIA_PRESENTE_MINUTOS else AttendanceStatus.TARDE
        )

        attendance = Attendance(
            student_profile_id=student_profile.id,
            commission_id=commission.id,
            classroom_id=device.classroom_id,
            fecha=now.date(),
            hora=current_time,
            estado=estado,
        )
        db.add(attendance)

        return log_and_respond(
            ScanResult.OK,
            "Estás en el aula correcta. Asistencia registrada.",
            student_profile_id=student_profile.id,
            materia=subject.nombre,
            asistencia_registrada=True,
            estado_asistencia=estado.value,
        )

    if other_now:
        slot, commission, subject = other_now
        aula_esperada = slot.classroom.codigo if slot.classroom else None
        return log_and_respond(
            ScanResult.WRONG_CLASSROOM,
            "Esta no es tu aula para la clase actual.",
            student_profile_id=student_profile.id,
            materia=subject.nombre,
            aula_esperada=aula_esperada,
            aula_detectada=device.classroom.codigo if device.classroom else None,
        )

    return log_and_respond(
        ScanResult.NO_CLASS_NOW,
        "No tenés ninguna clase asignada en este horario.",
        student_profile_id=student_profile.id,
    )
