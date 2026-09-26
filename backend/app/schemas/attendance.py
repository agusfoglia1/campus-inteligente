ifrom pydantic import BaseModel
from datetime import date, time
import uuid


class ValidarQRRequest(BaseModel):
    token: str
    classroom_id: uuid.UUID | None = None  # opcional: si el lector conoce su aula, permite validar coincidencia


class ValidarQRResponse(BaseModel):
    ok: bool
    mensaje: str
    estudiante_nombre: str | None = None
    materia_nombre: str | None = None
    comision_codigo: str | None = None
    estado: str | None = None
    fecha: date | None = None
    hora: time | None = None
