import uuid
from typing import Optional

from pydantic import BaseModel

from app.models.campus import LocationType


class LocationCreate(BaseModel):
    nombre: str
    tipo: LocationType
    latitude: float
    longitude: float
    descripcion: Optional[str] = None
    building_id: Optional[uuid.UUID] = None


class LocationUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[LocationType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    descripcion: Optional[str] = None
    building_id: Optional[uuid.UUID] = None


class LocationOut(BaseModel):
    id: uuid.UUID
    nombre: str
    tipo: LocationType
    latitude: float
    longitude: float
    descripcion: Optional[str] = None
    building_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


# --- Vista combinada para pintar el mapa completo de una sola llamada ---
class MapClassroomOut(BaseModel):
    id: uuid.UUID
    codigo: str


class MapBuildingOut(BaseModel):
    id: uuid.UUID
    nombre: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    classrooms: list[MapClassroomOut] = []


class CampusMapOut(BaseModel):
    buildings: list[MapBuildingOut]
    locations: list[LocationOut]
