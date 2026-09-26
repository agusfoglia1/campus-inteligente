import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models.academic import Building, Career, Classroom, Commission, ScheduleSlot, Subject
from app.models.enrollment import Enrollment
from app.models.profiles import TeacherProfile
from app.schemas.academic import (
    BuildingCreate,
    BuildingOut,
    BuildingUpdate,
    CareerCreate,
    CareerOut,
    CareerUpdate,
    ClassroomCreate,
    ClassroomOut,
    ClassroomUpdate,
    CommissionCreate,
    CommissionOut,
    CommissionUpdate,
    EnrollmentCreate,
    EnrollmentOut,
    ScheduleSlotCreate,
    ScheduleSlotOut,
    ScheduleSlotUpdate,
    SubjectCreate,
    SubjectOut,
    SubjectUpdate,
    TeacherProfileCreate,
    TeacherProfileOut,
)

router = APIRouter(prefix="/academic", tags=["academic"])


def _get_or_404(db: Session, model, obj_id: uuid.UUID, nombre: str):
    obj = db.query(model).filter(model.id == obj_id).first()
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{nombre} no encontrado/a")
    return obj


# ============ Buildings ============
@router.post("/buildings", response_model=BuildingOut, status_code=201)
def create_building(data: BuildingCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = Building(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/buildings", response_model=list[BuildingOut])
def list_buildings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Building).all()


@router.get("/buildings/{building_id}", response_model=BuildingOut)
def get_building(building_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _get_or_404(db, Building, building_id, "Edificio")


@router.put("/buildings/{building_id}", response_model=BuildingOut)
def update_building(
    building_id: uuid.UUID, data: BuildingUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    obj = _get_or_404(db, Building, building_id, "Edificio")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/buildings/{building_id}", status_code=204)
def delete_building(building_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = _get_or_404(db, Building, building_id, "Edificio")
    db.delete(obj)
    db.commit()


# ============ Classrooms ============
@router.post("/classrooms", response_model=ClassroomOut, status_code=201)
def create_classroom(data: ClassroomCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    _get_or_404(db, Building, data.building_id, "Edificio")
    obj = Classroom(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/classrooms", response_model=list[ClassroomOut])
def list_classrooms(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Classroom).all()


@router.get("/classrooms/{classroom_id}", response_model=ClassroomOut)
def get_classroom(classroom_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _get_or_404(db, Classroom, classroom_id, "Aula")


@router.put("/classrooms/{classroom_id}", response_model=ClassroomOut)
def update_classroom(
    classroom_id: uuid.UUID, data: ClassroomUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    obj = _get_or_404(db, Classroom, classroom_id, "Aula")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/classrooms/{classroom_id}", status_code=204)
def delete_classroom(classroom_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = _get_or_404(db, Classroom, classroom_id, "Aula")
    db.delete(obj)
    db.commit()


# ============ Careers ============
@router.post("/careers", response_model=CareerOut, status_code=201)
def create_career(data: CareerCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(Career).filter(Career.codigo == data.codigo).first():
        raise HTTPException(status_code=400, detail="Ya existe una carrera con ese código")
    obj = Career(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/careers", response_model=list[CareerOut])
def list_careers(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Career).all()


@router.get("/careers/{career_id}", response_model=CareerOut)
def get_career(career_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _get_or_404(db, Career, career_id, "Carrera")


@router.put("/careers/{career_id}", response_model=CareerOut)
def update_career(
    career_id: uuid.UUID, data: CareerUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    obj = _get_or_404(db, Career, career_id, "Carrera")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/careers/{career_id}", status_code=204)
def delete_career(career_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = _get_or_404(db, Career, career_id, "Carrera")
    db.delete(obj)
    db.commit()


# ============ Subjects ============
@router.post("/subjects", response_model=SubjectOut, status_code=201)
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    _get_or_404(db, Career, data.career_id, "Carrera")
    if db.query(Subject).filter(Subject.codigo == data.codigo).first():
        raise HTTPException(status_code=400, detail="Ya existe una materia con ese código")
    obj = Subject(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Subject).all()


@router.get("/subjects/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _get_or_404(db, Subject, subject_id, "Materia")


@router.put("/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: uuid.UUID, data: SubjectUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    obj = _get_or_404(db, Subject, subject_id, "Materia")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(subject_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = _get_or_404(db, Subject, subject_id, "Materia")
    db.delete(obj)
    db.commit()


# ============ TeacherProfiles (para poder asignar un docente a una comisión) ============
@router.post("/teacher-profiles", response_model=TeacherProfileOut, status_code=201)
def create_teacher_profile(data: TeacherProfileCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(TeacherProfile).filter(TeacherProfile.user_id == data.user_id).first():
        raise HTTPException(status_code=400, detail="Ese usuario ya tiene un perfil de docente")
    obj = TeacherProfile(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/teacher-profiles", response_model=list[TeacherProfileOut])
def list_teacher_profiles(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(TeacherProfile).all()


# ============ Commissions ============
@router.post("/commissions", response_model=CommissionOut, status_code=201)
def create_commission(data: CommissionCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    _get_or_404(db, Subject, data.subject_id, "Materia")
    if data.teacher_profile_id:
        _get_or_404(db, TeacherProfile, data.teacher_profile_id, "Docente")
    obj = Commission(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/commissions", response_model=list[CommissionOut])
def list_commissions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Commission).all()


@router.get("/commissions/{commission_id}", response_model=CommissionOut)
def get_commission(commission_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _get_or_404(db, Commission, commission_id, "Comisión")


@router.put("/commissions/{commission_id}", response_model=CommissionOut)
def update_commission(
    commission_id: uuid.UUID, data: CommissionUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    obj = _get_or_404(db, Commission, commission_id, "Comisión")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/commissions/{commission_id}", status_code=204)
def delete_commission(commission_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = _get_or_404(db, Commission, commission_id, "Comisión")
    db.delete(obj)
    db.commit()


# ============ ScheduleSlots (horarios) ============
@router.post("/schedule-slots", response_model=ScheduleSlotOut, status_code=201)
def create_schedule_slot(data: ScheduleSlotCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    _get_or_404(db, Commission, data.commission_id, "Comisión")
    _get_or_404(db, Classroom, data.classroom_id, "Aula")
    if data.hora_inicio >= data.hora_fin:
        raise HTTPException(status_code=400, detail="La hora de inicio debe ser anterior a la hora de fin")
    obj = ScheduleSlot(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/schedule-slots", response_model=list[ScheduleSlotOut])
def list_schedule_slots(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    commission_id: uuid.UUID | None = None,
    classroom_id: uuid.UUID | None = None,
):
    query = db.query(ScheduleSlot)
    if commission_id:
        query = query.filter(ScheduleSlot.commission_id == commission_id)
    if classroom_id:
        query = query.filter(ScheduleSlot.classroom_id == classroom_id)
    return query.all()


@router.put("/schedule-slots/{slot_id}", response_model=ScheduleSlotOut)
def update_schedule_slot(
    slot_id: uuid.UUID, data: ScheduleSlotUpdate, db: Session = Depends(get_db), _=Depends(require_admin)
):
    obj = _get_or_404(db, ScheduleSlot, slot_id, "Horario")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/schedule-slots/{slot_id}", status_code=204)
def delete_schedule_slot(slot_id: uuid.UUID, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = _get_or_404(db, ScheduleSlot, slot_id, "Horario")
    db.delete(obj)
    db.commit()


# ============ Enrollments (inscribir estudiantes a comisiones) ============
@router.post("/enrollments", response_model=EnrollmentOut, status_code=201)
def create_enrollment(data: EnrollmentCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    _get_or_404(db, Commission, data.commission_id, "Comisión")
    existing = (
        db.query(Enrollment)
        .filter(
            Enrollment.student_profile_id == data.student_profile_id,
            Enrollment.commission_id == data.commission_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="El estudiante ya está inscripto en esa comisión")
    obj = Enrollment(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return EnrollmentOut(
        id=obj.id,
        student_profile_id=obj.student_profile_id,
        commission_id=obj.commission_id,
        estado=obj.estado.value,
    )
