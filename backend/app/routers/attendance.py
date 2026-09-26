from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
import uuid

from app.db.session import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.academic import ScheduleSlot, DayOfWeek
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.profiles import StudentProfile
from app.schemas.attendance import ValidarQRRequest, ValidarQRResponse
from app.core.config import settings

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

DIAS_MAP = {
    0: DayOfWeek.LUNES, 1: DayOfWeek.MARTES, 2: DayOfWeek.MIERCOLES,
    3: DayOfWeek.JUEVES, 4: DayOfWeek.VIERNES, 5: DayOfWeek.SABADO,
}

TOLERANCIA_TARDE_MIN = 10  # minutos de gracia antes de marcar TARDE


def _decodificar_token_qr(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token inválido: falta sub")
        return uuid.UUID(user_id)
    except (JWTError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token QR inválido o expirado")


@router.post("/validar-qr", response_model=ValidarQRResponse)
def validar_qr(payload: ValidarQRRequest, db: Session = Depends(get_db)):
    user_id = _decodificar_token_qr(payload.token)

    student_profile = (
        db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    )
    if not student_profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No se encontró un perfil de estudiante para este usuario")

    ahora = datetime.now()
    dia_actual = DIAS_MAP.get(ahora.weekday())
    hora_actual = ahora.time()

    slot_query = db.query(ScheduleSlot).filter(
        ScheduleSlot.dia == dia_actual,
        ScheduleSlot.hora_inicio <= hora_actual,
        ScheduleSlot.hora_fin >= hora_actual,
    )
    if payload.classroom_id:
        slot_query = slot_query.filter(ScheduleSlot.classroom_id == payload.classroom_id)

    slot = slot_query.first()
    if not slot:
        return ValidarQRResponse(ok=False, mensaje="No hay ninguna clase activa en este horario/aula")

    commission = slot.commission

    enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.student_profile_id == student_profile.id,
            Enrollment.commission_id == commission.id,
            Enrollment.estado == EnrollmentStatus.CURSANDO,
        )
        .first()
    )
    if not enrollment:
        return ValidarQRResponse(
            ok=False, mensaje="El estudiante no está inscripto (cursando) en esta comisión"
        )

    ya_registrado = (
        db.query(Attendance)
        .filter(
            Attendance.student_profile_id == student_profile.id,
            Attendance.commission_id == commission.id,
            Attendance.fecha == ahora.date(),
        )
        .first()
    )
    if ya_registrado:
        return ValidarQRResponse(ok=False, mensaje="Asistencia ya registrada para esta clase hoy")

    limite_tarde = (
        datetime.combine(ahora.date(), slot.hora_inicio) + timedelta(minutes=TOLERANCIA_TARDE_MIN)
    )
    estado_asistencia = (
        AttendanceStatus.PRESENTE if ahora <= limite_tarde else AttendanceStatus.TARDE
    )

    nueva_asistencia = Attendance(
        student_profile_id=student_profile.id,
        commission_id=commission.id,
        classroom_id=slot.classroom_id,
        fecha=ahora.date(),
        hora=ahora.time(),
        estado=estado_asistencia,
    )
    db.add(nueva_asistencia)
    db.commit()
    db.refresh(nueva_asistencia)

    return ValidarQRResponse(
        ok=True,
        mensaje="Asistencia registrada correctamente",
        estudiante_nombre=student_profile.user.full_name,
        materia_nombre=commission.subject.nombre,
        comision_codigo=commission.codigo,
        estado=estado_asistencia.value,
        fecha=nueva_asistencia.fecha,
        hora=nueva_asistencia.hora,
    )
