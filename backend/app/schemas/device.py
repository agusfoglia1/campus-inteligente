import uuid
from typing import Optional

from pydantic import BaseModel

from app.models.scan_log import ScanResult


class QrTokenOut(BaseModel):
    token: str
    expires_in: int  # segundos


class DeviceCreate(BaseModel):
    nombre: str
    classroom_id: uuid.UUID


class DeviceOut(BaseModel):
    id: uuid.UUID
    nombre: str
    classroom_id: uuid.UUID
    is_active: bool

    class Config:
        from_attributes = True


class DeviceCreateOut(DeviceOut):
    api_key: str  # se muestra en texto plano SOLO en esta respuesta, una vez


class ScanRequest(BaseModel):
    token: str


class ScanResponseOut(BaseModel):
    result: ScanResult
    mensaje: str
    materia: Optional[str] = None
    aula_detectada: Optional[str] = None
    aula_esperada: Optional[str] = None
    asistencia_registrada: bool = False
    estado_asistencia: Optional[str] = None  # "presente" | "tarde" (solo si asistencia_registrada=True)
