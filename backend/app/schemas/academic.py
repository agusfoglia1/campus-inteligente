import datetime as dt
import uuid
from typing import Optional

from pydantic import BaseModel

from app.models.academic import CommissionStatus, DayOfWeek


# --- Building ---
class BuildingCreate(BaseModel):
    nombre: str
    ubicacion: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class BuildingUpdate(BaseModel):
    nombre: Optional[str] = None
    ubicacion: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class BuildingOut(BaseModel):
    id: uuid.UUID
    nombre: str
    ubicacion: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True


# --- Classroom ---
class ClassroomCreate(BaseModel):
    codigo: str
    building_id: uuid.UUID
    capacidad: Optional[int] = None


class ClassroomUpdate(BaseModel):
    codigo: Optional[str] = None
    capacidad: Optional[int] = None
    building_id: Optional[uuid.UUID] = None


class ClassroomOut(BaseModel):
    id: uuid.UUID
    codigo: str
    building_id: uuid.UUID
    capacidad: Optional[int] = None

    class Config:
        from_attributes = True


# --- Career ---
class CareerCreate(BaseModel):
    nombre: str
    codigo: str


class CareerUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None


class CareerOut(BaseModel):
    id: uuid.UUID
    nombre: str
    codigo: str

    class Config:
        from_attributes = True


# --- Subject ---
class SubjectCreate(BaseModel):
    nombre: str
    codigo: str
    career_id: uuid.UUID


class SubjectUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    career_id: Optional[uuid.UUID] = None


class SubjectOut(BaseModel):
    id: uuid.UUID
    nombre: str
    codigo: str
    career_id: uuid.UUID

    class Config:
        from_attributes = True


# --- TeacherProfile ---
class TeacherProfileCreate(BaseModel):
    user_id: uuid.UUID
    legajo_docente: Optional[str] = None


class TeacherProfileOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    legajo_docente: Optional[str] = None

    class Config:
        from_attributes = True


# --- Commission ---
class CommissionCreate(BaseModel):
    codigo: str
    subject_id: uuid.UUID
    teacher_profile_id: Optional[uuid.UUID] = None
    estado: CommissionStatus = CommissionStatus.ACTIVA


class CommissionUpdate(BaseModel):
    codigo: Optional[str] = None
    subject_id: Optional[uuid.UUID] = None
    teacher_profile_id: Optional[uuid.UUID] = None
    estado: Optional[CommissionStatus] = None


class CommissionOut(BaseModel):
    id: uuid.UUID
    codigo: str
    subject_id: uuid.UUID
    teacher_profile_id: Optional[uuid.UUID] = None
    estado: CommissionStatus

    class Config:
        from_attributes = True


# --- ScheduleSlot ---
class ScheduleSlotCreate(BaseModel):
    commission_id: uuid.UUID
    classroom_id: uuid.UUID
    dia: DayOfWeek
    hora_inicio: dt.time
    hora_fin: dt.time


class ScheduleSlotUpdate(BaseModel):
    commission_id: Optional[uuid.UUID] = None
    classroom_id: Optional[uuid.UUID] = None
    dia: Optional[DayOfWeek] = None
    hora_inicio: Optional[dt.time] = None
    hora_fin: Optional[dt.time] = None


class ScheduleSlotOut(BaseModel):
    id: uuid.UUID
    commission_id: uuid.UUID
    classroom_id: uuid.UUID
    dia: DayOfWeek
    hora_inicio: dt.time
    hora_fin: dt.time

    class Config:
        from_attributes = True


# --- Enrollment ---
class EnrollmentCreate(BaseModel):
    student_profile_id: uuid.UUID
    commission_id: uuid.UUID


class EnrollmentOut(BaseModel):
    id: uuid.UUID
    student_profile_id: uuid.UUID
    commission_id: uuid.UUID
    estado: str

    class Config:
        from_attributes = True
