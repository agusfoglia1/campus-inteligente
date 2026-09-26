import uuid

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class StudentProfile(Base):
    """Datos académicos del estudiante. Se crea vinculado a un User con role=student."""

    __tablename__ = "student_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    legajo = Column(String, unique=True, nullable=False)
    dni = Column(String, unique=True, nullable=True)
    career_id = Column(UUID(as_uuid=True), ForeignKey("careers.id"), nullable=False)
    anio_ingreso = Column(Integer, nullable=True)

    user = relationship("User")
    career = relationship("Career")
    enrollments = relationship("Enrollment", back_populates="student_profile")
    attendances = relationship("Attendance", back_populates="student_profile")


class TeacherProfile(Base):
    """Datos del docente. Se crea vinculado a un User con role=teacher."""

    __tablename__ = "teacher_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    legajo_docente = Column(String, unique=True, nullable=True)

    user = relationship("User")
    commissions = relationship("Commission", back_populates="teacher_profile")
