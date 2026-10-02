import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreate(BaseModel):
    titulo: str = Field(min_length=4, max_length=140)
    contenido: str = Field(min_length=10, max_length=5000)
    publicado: bool = True


class AnnouncementUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=4, max_length=140)
    contenido: str | None = Field(default=None, min_length=10, max_length=5000)
    publicado: bool | None = None


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    contenido: str
    publicado: bool
    autor_nombre: str | None = None
    created_at: dt.datetime
    updated_at: dt.datetime
