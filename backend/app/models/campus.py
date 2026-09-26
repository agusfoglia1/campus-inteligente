import enum
import uuid

from sqlalchemy import Column, Enum, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class LocationType(str, enum.Enum):
    BIBLIOTECA = "biblioteca"
    COMEDOR = "comedor"
    SALA_ESTUDIO = "sala_estudio"
    OFICINA = "oficina"
    BANO = "bano"
    LABORATORIO = "laboratorio"
    OTRO = "otro"


class CampusLocation(Base):
    """Puntos de interés del mapa del campus que NO son aulas (las aulas ya
    están en la tabla 'classrooms' y se ubican a través de su edificio).
    Ej: biblioteca, comedor, salas de estudio, oficinas, baños."""

    __tablename__ = "campus_locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    tipo = Column(Enum(LocationType), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    descripcion = Column(String, nullable=True)
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"), nullable=True)

    building = relationship("Building")
