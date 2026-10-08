import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.academic import Building, Classroom, Commission, ScheduleSlot, Subject
from app.models.attendance import Attendance, AttendanceStatus
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.profiles import StudentProfile, TeacherProfile
from app.models.user import User, UserRole
from app.schemas.dashboard import (
    AttendanceHistoryItemOut,
    ClassInfoOut,
    EnrollmentStatusOut,
    NextClassOut,
    StudentEnrollmentClassOut,
    StudentProfileOut,
    StudentDashboardOut,
)
from app.services.schedule import next_occurrence, today_as_dayofweek

router = APIRouter(prefix="/students", tags=["students"])


def get_current_student_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> StudentProfile:
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Esta información es solo para estudiantes")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Tu usuario todavía no tiene un perfil de estudiante asociado (legajo, carrera, etc.)",
        )
    return profile


def _get_active_schedule_slots(profile: StudentProfile, db: Session):
    """Trae todos los bloques horarios de las comisiones en las que el
    estudiante está cursando actualmente, con toda la info relacionada."""
    return (
        db.query(ScheduleSlot, Commission, Subject, Classroom, Building)
        .join(Commission, ScheduleSlot.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .join(Classroom, ScheduleSlot.classroom_id == Classroom.id)
        .join(Building, Classroom.building_id == Building.id)
        .join(Enrollment, Enrollment.commission_id == Commission.id)
        .options(joinedload(Commission.teacher_profile).joinedload(TeacherProfile.user))
        .filter(Enrollment.student_profile_id == profile.id)
        .filter(Enrollment.estado.in_(
            [EnrollmentStatus.CURSANDO, EnrollmentStatus.PENDIENTE_APROBACION, EnrollmentStatus.SOLICITUD_RECHAZADA]
        ))
        .all()
    )


def _build_class_info(slot, commission, subject, classroom, building) -> ClassInfoOut:
    docente_nombre = None
    if commission.teacher_profile and commission.teacher_profile.user:
        docente_nombre = commission.teacher_profile.user.full_name

    return ClassInfoOut(
        commission_id=commission.id,
        materia=subject.nombre,
        materia_codigo=subject.codigo,
        docente=docente_nombre,
        aula=classroom.codigo,
        edificio=building.nombre,
        dia=slot.dia.value,
        hora_inicio=slot.hora_inicio,
        hora_fin=slot.hora_fin,
    )


@router.get("/me/dashboard", response_model=StudentDashboardOut)
def get_dashboard(
    profile: StudentProfile = Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    now = dt.datetime.now()
    rows = _get_active_schedule_slots(profile, db)

    # Materias del día
    today = today_as_dayofweek(now)
    materias_del_dia = [
        _build_class_info(*row) for row in rows if today is not None and row[0].dia == today
    ]
    materias_del_dia.sort(key=lambda c: c.hora_inicio)

    # Próxima clase (la ocurrencia más cercana entre todos los horarios)
    proxima_clase = None
    best_dt, best_row = None, None
    for row in rows:
        slot = row[0]
        occurrence = next_occurrence(slot.dia, slot.hora_inicio, now)
        if best_dt is None or occurrence < best_dt:
            best_dt, best_row = occurrence, row

    if best_row is not None:
        info = _build_class_info(*best_row)
        proxima_clase = NextClassOut(**info.model_dump(), fecha=best_dt.date())

    # Historial reciente (últimos 10 registros de asistencia)
    historial_rows = (
        db.query(Attendance, Subject, Classroom)
        .join(Commission, Attendance.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .join(Classroom, Attendance.classroom_id == Classroom.id)
        .filter(Attendance.student_profile_id == profile.id)
        .order_by(Attendance.fecha.desc(), Attendance.hora.desc())
        .limit(10)
        .all()
    )
    historial_reciente = [
        AttendanceHistoryItemOut(
            fecha=a.fecha, hora=a.hora, materia=sub.nombre, aula=cl.codigo, estado=a.estado.value
        )
        for (a, sub, cl) in historial_rows
    ]

    # Porcentaje de asistencia (sobre el total de registros que existan hasta ahora)
    attendance_total, attendance_present = db.query(
        func.count(Attendance.id),
        func.sum(case((Attendance.estado.in_([AttendanceStatus.PRESENTE, AttendanceStatus.TARDE]), 1), else_=0)),
    ).filter(Attendance.student_profile_id == profile.id).one()
    porcentaje_asistencia = None
    if attendance_total > 0:
        porcentaje_asistencia = round(((attendance_present or 0) / attendance_total) * 100, 1)

    return StudentDashboardOut(
        nombre=profile.user.full_name,
        legajo=profile.legajo,
        proxima_clase=proxima_clase,
        materias_del_dia=materias_del_dia,
        porcentaje_asistencia=porcentaje_asistencia,
        historial_reciente=historial_reciente,
    )


@router.get("/me/materias", response_model=list[ClassInfoOut])
def get_my_subjects(
    profile: StudentProfile = Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    """Todas las materias/comisiones en las que el estudiante está cursando,
    con su horario. Sirve para la pantalla 'Ver mis próximas clases'."""
    rows = _get_active_schedule_slots(profile, db)
    classes = [_build_class_info(*row) for row in rows]
    classes.sort(key=lambda c: (c.dia, c.hora_inicio))
    return classes


@router.get("/me/materias-inscriptas", response_model=list[StudentEnrollmentClassOut])
def get_my_enrolled_subjects(
    profile: StudentProfile = Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    """Lista los horarios de todas las inscripciones, incluidas las aprobadas."""
    rows = (
        db.query(Enrollment, ScheduleSlot, Commission, Subject, Classroom, Building)
        .join(Commission, Enrollment.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .join(ScheduleSlot, ScheduleSlot.commission_id == Commission.id)
        .join(Classroom, ScheduleSlot.classroom_id == Classroom.id)
        .join(Building, Classroom.building_id == Building.id)
        .filter(Enrollment.student_profile_id == profile.id)
        .all()
    )
    classes = []
    for enrollment, slot, commission, subject, classroom, building in rows:
        info = _build_class_info(slot, commission, subject, classroom, building)
        classes.append(
            StudentEnrollmentClassOut(
                **info.model_dump(), enrollment_id=enrollment.id, estado=enrollment.estado.value
            )
        )
    classes.sort(key=lambda c: (c.dia, c.hora_inicio, c.materia))
    return classes


@router.post("/me/materias/{commission_id}/solicitar-aprobacion", response_model=EnrollmentStatusOut)
def request_subject_approval(
    commission_id: uuid.UUID,
    profile: StudentProfile = Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    """Solicita que administración valide como aprobada una materia del estudiante."""
    enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.student_profile_id == profile.id,
            Enrollment.commission_id == commission_id,
        )
        .first()
    )
    if enrollment is None:
        raise HTTPException(status_code=404, detail="No estás inscripto en esa comisión")
    if enrollment.estado == EnrollmentStatus.APROBADA:
        raise HTTPException(status_code=409, detail="La materia ya figura como aprobada")
    if enrollment.estado == EnrollmentStatus.PENDIENTE_APROBACION:
        return EnrollmentStatusOut(commission_id=commission_id, estado=enrollment.estado.value)
    enrollment.estado = EnrollmentStatus.PENDIENTE_APROBACION
    db.commit()
    return EnrollmentStatusOut(commission_id=commission_id, estado=enrollment.estado.value)


@router.get("/me/perfil", response_model=StudentProfileOut)
def get_my_profile(
    profile: StudentProfile = Depends(get_current_student_profile),
    db: Session = Depends(get_db),
):
    enrollments = db.query(Enrollment).filter(Enrollment.student_profile_id == profile.id).all()
    return StudentProfileOut(
        nombre=profile.user.full_name,
        email=profile.user.email,
        legajo=profile.legajo,
        carrera=profile.career.nombre,
        anio_ingreso=profile.anio_ingreso,
        materias_total=len(enrollments),
        materias_aprobadas=sum(1 for item in enrollments if item.estado == EnrollmentStatus.APROBADA),
        solicitudes_pendientes=sum(1 for item in enrollments if item.estado == EnrollmentStatus.PENDIENTE_APROBACION),
    )


@router.get("/me/asistencias", response_model=list[AttendanceHistoryItemOut])
def get_my_attendance_history(
    profile: StudentProfile = Depends(get_current_student_profile),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    """Historial completo de asistencias (paginado con 'limit')."""
    rows = (
        db.query(Attendance, Subject, Classroom)
        .join(Commission, Attendance.commission_id == Commission.id)
        .join(Subject, Commission.subject_id == Subject.id)
        .join(Classroom, Attendance.classroom_id == Classroom.id)
        .filter(Attendance.student_profile_id == profile.id)
        .order_by(Attendance.fecha.desc(), Attendance.hora.desc())
        .limit(limit)
        .all()
    )
    return [
        AttendanceHistoryItemOut(
            fecha=a.fecha, hora=a.hora, materia=sub.nombre, aula=cl.codigo, estado=a.estado.value
        )
        for (a, sub, cl) in rows
    ]
