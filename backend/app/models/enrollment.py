import enum
import uuid

from sqlalchemy import Column, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class EnrollmentStatus(str, enum.Enum):
    CURSANDO = "cursando"
    APROBADA = "aprobada"
    DESAPROBADA = "desaprobada"
    LIBRE = "libre"
    PENDIENTE_APROBACION = "pendiente_aprobacion"
    SOLICITUD_RECHAZADA = "solicitud_rechazada"


class Enrollment(Base):
    """Vincula a un estudiante con una comisión específica de una materia."""

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_profile_id", "commission_id", name="uq_enrollment_student_commission"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_profile_id = Column(UUID(as_uuid=True), ForeignKey("student_profiles.id"), nullable=False)
    commission_id = Column(UUID(as_uuid=True), ForeignKey("commissions.id"), nullable=False)
    estado = Column(Enum(EnrollmentStatus), nullable=False, default=EnrollmentStatus.CURSANDO)

    student_profile = relationship("StudentProfile", back_populates="enrollments")
    commission = relationship("Commission", back_populates="enrollments")
