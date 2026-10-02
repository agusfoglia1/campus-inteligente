import datetime as dt
import uuid
from typing import Optional

from pydantic import BaseModel


class ClassInfoOut(BaseModel):
    commission_id: uuid.UUID
    materia: str
    materia_codigo: str
    docente: Optional[str] = None
    aula: str
    edificio: str
    dia: str
    hora_inicio: dt.time
    hora_fin: dt.time


class StudentEnrollmentClassOut(ClassInfoOut):
    enrollment_id: uuid.UUID
    estado: str


class EnrollmentStatusOut(BaseModel):
    commission_id: uuid.UUID
    estado: str


class StudentProfileOut(BaseModel):
    nombre: str
    email: str
    legajo: str
    carrera: str
    anio_ingreso: Optional[int] = None
    materias_total: int
    materias_aprobadas: int
    solicitudes_pendientes: int


class NextClassOut(ClassInfoOut):
    fecha: dt.date


class AttendanceHistoryItemOut(BaseModel):
    fecha: dt.date
    hora: dt.time
    materia: str
    aula: str
    estado: str


class StudentDashboardOut(BaseModel):
    nombre: str
    legajo: str
    proxima_clase: Optional[NextClassOut] = None
    materias_del_dia: list[ClassInfoOut] = []
    porcentaje_asistencia: Optional[float] = None
    historial_reciente: list[AttendanceHistoryItemOut] = []
