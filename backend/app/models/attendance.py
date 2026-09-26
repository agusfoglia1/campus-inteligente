import enum
import uuid

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Time, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class AttendanceStatus(str, enum.Enum):
    PRESENTE = "presente"
    TARDE = "tarde"
    AUSENTE = "ausente"


class Attendance(Base):
    """Registro de asistencia de un estudiante a una comisión en una fecha.

    Desde la Etapa 6, esta tabla se completa automáticamente cuando un
    escaneo QR válido llega a POST /devices/scan (ver app/api/v1/devices.py).
    La UniqueConstraint evita que dos escaneos válidos el mismo día generen
    dos registros duplicados para el mismo estudiante y la misma comisión.
    """

    __tablename__ = "attendances"
    __table_args__ = (
        UniqueConstraint(
            "student_profile_id", "commission_id", "fecha", name="uq_attendance_student_commission_fecha"
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_profile_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    commission_id = Column(UUID(as_uuid=True), ForeignKey("commissions.id"), nullable=False)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    estado = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENTE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student_profile = relationship("StudentProfile", back_populates="attendances")
    commission = relationship("Commission")
    classroom = relationship("Classroom")
