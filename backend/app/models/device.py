import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Device(Base):
    """Un dispositivo físico (Raspberry Pi + cámara) fijo en la puerta de un aula.

    La API key se guarda hasheada (nunca en texto plano). Se muestra en
    texto plano UNA sola vez, al momento de crear el dispositivo, para que
    se pueda copiar a la config del dispositivo físico.
    """

    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)  # ej: "Camara puerta A-204"
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    api_key_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    classroom = relationship("Classroom")
