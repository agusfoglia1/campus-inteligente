import datetime as dt
import uuid
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.enrollment import EnrollmentStatus


# --- Alta y edición de estudiantes (crea User + StudentProfile juntos) ---
class StudentAdminCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    legajo: str
    dni: Optional[str] = None
    career_id: uuid.UUID
    anio_ingreso: Optional[int] = None


class StudentAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    legajo: Optional[str] = None
    dni: Optional[str] = None
    career_id: Optional[uuid.UUID] = None
    anio_ingreso: Optional[int] = None
    is_active: Optional[bool] = None


class StudentAdminOut(BaseModel):
    user_id: uuid.UUID
    student_profile_id: uuid.UUID
    email: str
    full_name: str
    legajo: str
    dni: Optional[str] = None
    career_id: uuid.UUID
    anio_ingreso: Optional[int] = None
    is_active: bool


# --- Dispositivos (listar / activar-desactivar) ---
class DeviceAdminOut(BaseModel):
    id: uuid.UUID
    nombre: str
    classroom_id: uuid.UUID
    is_active: bool

    class Config:
        from_attributes = True


class DeviceAdminUpdate(BaseModel):
    nombre: Optional[str] = None
    is_active: Optional[bool] = None


# --- Consulta global de asistencias ---
class AttendanceAdminOut(BaseModel):
    fecha: dt.date
    hora: dt.time
    estudiante: str
    legajo: str
    materia: str
    comision: str
    aula: str
    estado: str


# --- Auditoría de escaneos (actividad) ---
class ScanLogAdminOut(BaseModel):
    created_at: dt.datetime
    dispositivo: str
    aula: str
    estudiante: Optional[str] = None
    result: str


# --- Estadísticas generales ---
class StatsOut(BaseModel):
    total_estudiantes: int
    total_docentes: int
    total_carreras: int
    total_materias: int
    total_comisiones: int
    total_dispositivos_activos: int
    total_asistencias_registradas: int
    asistencias_presente: int
    asistencias_tarde: int


class EnrollmentReviewOut(BaseModel):
    id: uuid.UUID
    student_profile_id: uuid.UUID
    estudiante: str
    legajo: str
    materia: str
    materia_codigo: str
    commission_id: uuid.UUID
    comision: str
    estado: str


class EnrollmentReviewUpdate(BaseModel):
    estado: EnrollmentStatus
