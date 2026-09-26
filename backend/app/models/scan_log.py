import enum
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class ScanResult(str, enum.Enum):
    OK = "ok"                          # token válido, aula y horario correctos
    WRONG_CLASSROOM = "wrong_classroom"  # el estudiante tiene clase, pero en otra aula
    NO_CLASS_NOW = "no_class_now"        # el estudiante no tiene clase en este momento
    INVALID_TOKEN = "invalid_token"      # token vencido, mal formado o firma inválida
    REPLAY = "replay"                    # el token ya se había usado antes
    UNKNOWN_STUDENT = "unknown_student"  # el token es válido pero el estudiante no existe/perfil no existe


class ScanLog(Base):
    """Auditoría de TODOS los intentos de escaneo, exitosos o no.
    Requisito de seguridad: registrar fecha, hora, estudiante (si se pudo
    identificar) y aula para cada escaneo."""

    __tablename__ = "scan_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    student_profile_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=True)
    result = Column(Enum(ScanResult), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    device = relationship("Device")
    classroom = relationship("Classroom")
    student_profile = relationship("StudentProfile")


class UsedQrToken(Base):
    """Guarda el 'jti' (id único) de cada token QR ya consumido, para
    evitar que el mismo token se use dos veces (anti-replay)."""

    __tablename__ = "used_qr_tokens"

    jti = Column(String, primary_key=True)
    used_at = Column(DateTime(timezone=True), server_default=func.now())
