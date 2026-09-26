import datetime as dt
import uuid
from typing import Optional

from pydantic import BaseModel


class ScheduleInfoOut(BaseModel):
    dia: str
    hora_inicio: dt.time
    hora_fin: dt.time
    aula: str
    edificio: str


class TeacherCommissionOut(BaseModel):
    commission_id: uuid.UUID
    codigo: str
    materia: str
    materia_codigo: str
    estado: str
    horarios: list[ScheduleInfoOut] = []


class EnrolledStudentOut(BaseModel):
    student_profile_id: uuid.UUID
    legajo: str
    nombre: str
    estado_inscripcion: str


class CommissionAttendanceRecordOut(BaseModel):
    fecha: dt.date
    hora: dt.time
    estudiante: str
    legajo: str
    estado: str


class StudentAttendanceStatOut(BaseModel):
    student_profile_id: uuid.UUID
    legajo: str
    nombre: str
    total_registros: int
    presentes: int
    tardes: int
