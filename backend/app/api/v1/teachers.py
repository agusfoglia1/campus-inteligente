import uuid
import datetime as dt
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.academic import Building, Classroom, Commission, DayOfWeek, ScheduleSlot, Subject
from app.models.attendance import Attendance, AttendanceStatus
from app.models.enrollment import Enrollment
from app.models.profiles import StudentProfile, TeacherProfile
from app.models.user import User, UserRole
from app.schemas.teacher import (
    CommissionAttendanceRecordOut,
    EnrolledStudentOut,
    ScheduleInfoOut,
    StudentAttendanceStatOut,
    TeacherCommissionOut,
    ManualAttendanceCreate,
)

router = APIRouter(prefix="/teachers", tags=["teachers"])


def get_current_teacher_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> TeacherProfile:
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Esta información es solo para docentes")

    profile = db.query(TeacherProfile).filter(TeacherProfile.user_id == current_user.id).first()
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Tu usuario todavía no tiene un perfil de docente asociado. Pedile a un admin que lo cree.",
        )
    return profile


def _get_owned_commission(commission_id: uuid.UUID, teacher: TeacherProfile, db: Session) -> Commission:
    commission = db.query(Commission).filter(Commission.id == commission_id).first()
    if commission is None:
        raise HTTPException(status_code=404, detail="Comisión no encontrada")
    if commission.teacher_profile_id != teacher.id:
        raise HTTPException(status_code=403, detail="Esta comisión no está a tu cargo")
    return commission


@router.get("/me/commissions", response_model=list[TeacherCommissionOut])
def get_my_commissions(
    teacher: TeacherProfile = Depends(get_current_teacher_profile), db: Session = Depends(get_db)
):
    """Todas las comisiones a cargo del docente, con materia y horarios."""
    commissions = db.query(Commission).filter(Commission.teacher_profile_id == teacher.id).all()

    result = []
    for commission in commissions:
        subject = db.query(Subject).filter(Subject.id == commission.subject_id).first()
        slots = db.query(ScheduleSlot).filter(ScheduleSlot.commission_id == commission.id).all()

        horarios = []
        for slot in slots:
            classroom = db.query(Classroom).filter(Classroom.id == slot.classroom_id).first()
            building = db.query(Building).filter(Building.id == classroom.building_id).first() if classroom else None
            horarios.append(
                ScheduleInfoOut(
                    dia=slot.dia.value,
                    hora_inicio=slot.hora_inicio,
                    hora_fin=slot.hora_fin,
                    aula=classroom.codigo if classroom else "?",
                    edificio=building.nombre if building else "?",
                )
            )

        result.append(
            TeacherCommissionOut(
                commission_id=commission.id,
                codigo=commission.codigo,
                materia=subject.nombre if subject else "?",
                materia_codigo=subject.codigo if subject else "?",
                estado=commission.estado.value,
                horarios=horarios,
            )
        )
    return result


@router.get("/me/commissions/{commission_id}/students", response_model=list[EnrolledStudentOut])
def get_enrolled_students(
    commission_id: uuid.UUID,
    teacher: TeacherProfile = Depends(get_current_teacher_profile),
    db: Session = Depends(get_db),
):
    """Estudiantes inscriptos en una comisión a cargo del docente."""
    _get_owned_commission(commission_id, teacher, db)

    rows = (
        db.query(Enrollment, StudentProfile, User)
        .join(StudentProfile, Enrollment.student_profile_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .filter(Enrollment.commission_id == commission_id)
        .all()
    )
    return [
        EnrolledStudentOut(
            student_profile_id=sp.id,
            legajo=sp.legajo,
            nombre=u.full_name,
            estado_inscripcion=e.estado.value,
        )
        for (e, sp, u) in rows
    ]


@router.get("/me/commissions/{commission_id}/attendance", response_model=list[CommissionAttendanceRecordOut])
def get_commission_attendance(
    commission_id: uuid.UUID,
    teacher: TeacherProfile = Depends(get_current_teacher_profile),
    db: Session = Depends(get_db),
    fecha: str | None = None,
):
    """Todos los registros de asistencia de una comisión (quién asistió, cuándo).
    Opcionalmente filtrable por fecha exacta (YYYY-MM-DD)."""
    _get_owned_commission(commission_id, teacher, db)

    query = (
        db.query(Attendance, StudentProfile, User)
        .join(StudentProfile, Attendance.student_profile_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .filter(Attendance.commission_id == commission_id)
    )
    if fecha:
        query = query.filter(Attendance.fecha == fecha)

    rows = query.order_by(Attendance.fecha.desc(), Attendance.hora.desc()).all()
    return [
        CommissionAttendanceRecordOut(
            fecha=a.fecha, hora=a.hora, estudiante=u.full_name, legajo=sp.legajo, estado=a.estado.value
        )
        for (a, sp, u) in rows
    ]


@router.post("/me/commissions/{commission_id}/attendance/manual", response_model=CommissionAttendanceRecordOut, status_code=201)
def create_manual_attendance(commission_id: uuid.UUID, data: ManualAttendanceCreate,
    teacher: TeacherProfile = Depends(get_current_teacher_profile), db: Session = Depends(get_db)):
    _get_owned_commission(commission_id, teacher, db)
    if data.fecha > dt.date.today():
        raise HTTPException(status_code=422, detail="No se puede registrar asistencia para una fecha futura")
    enrollment = db.query(Enrollment).filter(
        Enrollment.commission_id == commission_id,
        Enrollment.student_profile_id == data.student_profile_id,
        Enrollment.estado.in_(["CURSANDO", "PENDIENTE_APROBACION", "SOLICITUD_RECHAZADA"]),
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="El estudiante no está inscripto en esta comisión")
    day_names = [DayOfWeek.LUNES, DayOfWeek.MARTES, DayOfWeek.MIERCOLES,
        DayOfWeek.JUEVES, DayOfWeek.VIERNES, DayOfWeek.SABADO, None]
    weekday = day_names[data.fecha.weekday()]
    slots = db.query(ScheduleSlot).filter(ScheduleSlot.commission_id == commission_id,
        ScheduleSlot.dia == weekday).all() if weekday else []
    if not slots:
        raise HTTPException(status_code=422, detail="La comisión no tiene clase programada ese día")
    if db.query(Attendance).filter(Attendance.student_profile_id == data.student_profile_id,
        Attendance.commission_id == commission_id, Attendance.fecha == data.fecha).first():
        raise HTTPException(status_code=409, detail="Ya existe asistencia para ese estudiante y fecha")
    profile = db.query(StudentProfile).filter(StudentProfile.id == data.student_profile_id).first()
    user = db.query(User).filter(User.id == profile.user_id).first()
    record = Attendance(student_profile_id=profile.id, commission_id=commission_id,
        fecha=data.fecha, hora=dt.datetime.now().time().replace(microsecond=0),
        estado=data.estado, classroom_id=slots[0].classroom_id)
    db.add(record)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="No se pudo registrar: ya existe una asistencia para esa fecha")
    return CommissionAttendanceRecordOut(fecha=record.fecha, hora=record.hora,
        estudiante=user.full_name, legajo=profile.legajo, estado=record.estado.value)


@router.get("/me/commissions/{commission_id}/stats", response_model=list[StudentAttendanceStatOut])
def get_commission_attendance_stats(
    commission_id: uuid.UUID,
    teacher: TeacherProfile = Depends(get_current_teacher_profile),
    db: Session = Depends(get_db),
):
    """Estadística de asistencia por estudiante inscripto en la comisión:
    cuántos registros tiene, cuántos presente, cuántos tarde.

    Nota: cuenta sobre los registros que existen (generados por escaneos QN
    reales), no contra un calendario completo de clases dictadas — todavía
    no generamos automáticamente las clases que "deberían" haber ocurrido."""
    _get_owned_commission(commission_id, teacher, db)

    enrolled = (
        db.query(StudentProfile, User)
        .join(Enrollment, Enrollment.student_profile_id == StudentProfile.id)
        .join(User, StudentProfile.user_id == User.id)
        .filter(Enrollment.commission_id == commission_id)
        .all()
    )

    attendance_rows = db.query(Attendance).filter(Attendance.commission_id == commission_id).all()
    by_student = defaultdict(list)
    for a in attendance_rows:
        by_student[a.student_profile_id].append(a)

    result = []
    for sp, u in enrolled:
        records = by_student.get(sp.id, [])
        result.append(
            StudentAttendanceStatOut(
                student_profile_id=sp.id,
                legajo=sp.legajo,
                nombre=u.full_name,
                total_registros=len(records),
                presentes=sum(1 for r in records if r.estado == AttendanceStatus.PRESENTE),
                tardes=sum(1 for r in records if r.estado == AttendanceStatus.TARDE),
            )
        )
    return result
