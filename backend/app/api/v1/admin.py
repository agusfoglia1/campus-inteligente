import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.academic import Career, Classroom, Commission, Subject
from app.models.attendance import Attendance, AttendanceStatus
from app.models.device import Device
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.profiles import StudentProfile, TeacherProfile
from app.models.scan_log import ScanLog
from app.models.user import User, UserRole
from app.schemas.admin import (
    AttendanceAdminOut,
    DeviceAdminOut,
    DeviceAdminUpdate,
    ScanLogAdminOut,
    StatsOut,
    StudentAdminCreate,
    StudentAdminOut,
    StudentAdminUpdate,
    EnrollmentReviewOut,
    EnrollmentReviewUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _enrollment_review_out(enrollment, profile, user, commission, subject):
    return EnrollmentReviewOut(
        id=enrollment.id, student_profile_id=profile.id, estudiante=user.full_name,
        legajo=profile.legajo, materia=subject.nombre, materia_codigo=subject.codigo,
        commission_id=commission.id, comision=commission.codigo, estado=enrollment.estado.value,
    )


@router.get("/enrollments/pending", response_model=list[EnrollmentReviewOut])
def list_pending_enrollments(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = (db.query(Enrollment, StudentProfile, User, Commission, Subject)
        .join(StudentProfile, Enrollment.student_profile_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .join(Commission, Enrollment.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .filter(Enrollment.estado == EnrollmentStatus.PENDIENTE_APROBACION)
        .order_by(User.full_name, Subject.nombre).all())
    return [_enrollment_review_out(*row) for row in rows]


@router.put("/enrollments/{enrollment_id}/review", response_model=EnrollmentReviewOut)
def review_enrollment(enrollment_id: uuid.UUID, data: EnrollmentReviewUpdate,
                      db: Session = Depends(get_db), _=Depends(require_admin)):
    if data.estado not in (EnrollmentStatus.APROBADA, EnrollmentStatus.SOLICITUD_RECHAZADA):
        raise HTTPException(status_code=422, detail="La revisión debe aprobar o rechazar la solicitud")
    row = (db.query(Enrollment, StudentProfile, User, Commission, Subject)
        .join(StudentProfile, Enrollment.student_profile_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .join(Commission, Enrollment.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .filter(Enrollment.id == enrollment_id).first())
    if not row:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if row[0].estado != EnrollmentStatus.PENDIENTE_APROBACION:
        raise HTTPException(status_code=409, detail="La solicitud ya fue revisada")
    row[0].estado = data.estado
    db.commit()
    db.refresh(row[0])
    return _enrollment_review_out(*row)


def _student_out(user: User, profile: StudentProfile) -> StudentAdminOut:
    return StudentAdminOut(
        user_id=user.id,
        student_profile_id=profile.id,
        email=user.email,
        full_name=user.full_name,
        legajo=profile.legajo,
        dni=profile.dni,
        career_id=profile.career_id,
        anio_ingreso=profile.anio_ingreso,
        is_active=user.is_active,
    )


# ============ Estudiantes (crear User + StudentProfile juntos) ============
@router.post("/students", response_model=StudentAdminOut, status_code=201)
def create_student(data: StudentAdminCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    if db.query(StudentProfile).filter(StudentProfile.legajo == data.legajo).first():
        raise HTTPException(status_code=400, detail="Ya existe un estudiante con ese legajo")
    if not db.query(Career).filter(Career.id == data.career_id).first():
        raise HTTPException(status_code=404, detail="Carrera no encontrada")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.flush()  # para tener user.id sin cerrar la transacción

    profile = StudentProfile(
        user_id=user.id,
        legajo=data.legajo,
        dni=data.dni,
        career_id=data.career_id,
        anio_ingreso=data.anio_ingreso,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return _student_out(user, profile)


@router.get("/students", response_model=list[StudentAdminOut])
def list_students(db: Session = Depends(get_db), _=Depends(require_admin)):
    rows = db.query(StudentProfile, User).join(User, StudentProfile.user_id == User.id).all()
    return [_student_out(u, p) for (p, u) in rows]


@router.get("/students/{student_profile_id}", response_model=StudentAdminOut)
def get_student(student_profile_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    user = db.query(User).filter(User.id == profile.user_id).first()
    return _student_out(user, profile)


@router.put("/students/{student_profile_id}", response_model=StudentAdminOut)
def update_student(
    student_profile_id: uuid.UUID,
    data: StudentAdminUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    user = db.query(User).filter(User.id == profile.user_id).first()

    updates = data.model_dump(exclude_unset=True)
    if "full_name" in updates:
        user.full_name = updates.pop("full_name")
    if "is_active" in updates:
        user.is_active = updates.pop("is_active")
    for field, value in updates.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(user)
    db.refresh(profile)
    return _student_out(user, profile)


# ============ Dispositivos (listar / activar-desactivar) ============
@router.get("/devices", response_model=list[DeviceAdminOut])
def list_devices(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(Device).all()


@router.put("/devices/{device_id}", response_model=DeviceAdminOut)
def update_device(
    device_id: uuid.UUID, data: DeviceAdminUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if device is None:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


# ============ Asistencias (vista global, con filtros) ============
@router.get("/attendances", response_model=list[AttendanceAdminOut])
def list_all_attendances(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    student_profile_id: uuid.UUID | None = None,
    commission_id: uuid.UUID | None = None,
    fecha: dt.date | None = None,
    desde: dt.date | None = None,
    hasta: dt.date | None = None,
    estado: AttendanceStatus | None = None,
    limit: int = Query(default=1000, ge=1, le=2000),
):
    query = (
        db.query(Attendance, StudentProfile, User, Commission, Subject, Classroom)
        .join(StudentProfile, Attendance.student_profile_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .join(Commission, Attendance.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .join(Classroom, Attendance.classroom_id == Classroom.id)
    )
    if student_profile_id:
        query = query.filter(Attendance.student_profile_id == student_profile_id)
    if commission_id:
        query = query.filter(Attendance.commission_id == commission_id)
    if fecha:
        query = query.filter(Attendance.fecha == fecha)
    if desde:
        query = query.filter(Attendance.fecha >= desde)
    if hasta:
        query = query.filter(Attendance.fecha <= hasta)
    if estado:
        query = query.filter(Attendance.estado == estado)

    rows = query.order_by(Attendance.fecha.desc(), Attendance.hora.desc()).limit(limit).all()
    return [
        AttendanceAdminOut(
            fecha=a.fecha,
            hora=a.hora,
            estudiante=u.full_name,
            legajo=sp.legajo,
            materia=sub.nombre,
            comision=c.codigo,
            aula=cl.codigo,
            estado=a.estado.value,
        )
        for (a, sp, u, c, sub, cl) in rows
    ]


# ============ Actividad (auditoría de escaneos) ============
@router.get("/scan-logs", response_model=list[ScanLogAdminOut])
def list_scan_logs(
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    device_id: uuid.UUID | None = None,
    limit: int = 100,
):
    query = db.query(ScanLog)
    if device_id:
        query = query.filter(ScanLog.device_id == device_id)

    rows = query.order_by(ScanLog.created_at.desc()).limit(limit).all()

    result = []
    for log in rows:
        device = db.query(Device).filter(Device.id == log.device_id).first()
        classroom = db.query(Classroom).filter(Classroom.id == log.classroom_id).first()
        estudiante = None
        if log.student_profile_id:
            sp = db.query(StudentProfile).filter(StudentProfile.id == log.student_profile_id).first()
            if sp:
                u = db.query(User).filter(User.id == sp.user_id).first()
                estudiante = u.full_name if u else None

        result.append(
            ScanLogAdminOut(
                created_at=log.created_at,
                dispositivo=device.nombre if device else "?",
                aula=classroom.codigo if classroom else "?",
                estudiante=estudiante,
                result=log.result.value,
            )
        )
    return result


# ============ Estadísticas generales ============
@router.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    total_asistencias = db.query(Attendance).count()
    presentes = db.query(Attendance).filter(Attendance.estado == AttendanceStatus.PRESENTE).count()
    tardes = db.query(Attendance).filter(Attendance.estado == AttendanceStatus.TARDE).count()

    return StatsOut(
        total_estudiantes=db.query(StudentProfile).count(),
        total_docentes=db.query(TeacherProfile).count(),
        total_carreras=db.query(Career).count(),
        total_materias=db.query(Subject).count(),
        total_comisiones=db.query(Commission).count(),
        total_dispositivos_activos=db.query(Device).filter(Device.is_active == True).count(),  # noqa: E712
        total_asistencias_registradas=total_asistencias,
        asistencias_presente=presentes,
        asistencias_tarde=tardes,
    )
