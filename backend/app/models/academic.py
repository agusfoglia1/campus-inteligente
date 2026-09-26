import enum
import uuid

from sqlalchemy import Column, Enum, Float, ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class DayOfWeek(str, enum.Enum):
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"


class CommissionStatus(str, enum.Enum):
    ACTIVA = "activa"
    FINALIZADA = "finalizada"
    CANCELADA = "cancelada"


class Building(Base):
    __tablename__ = "buildings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    ubicacion = Column(String, nullable=True)
    # Coordenadas para el mapa del campus (Etapa 9). Nullable porque los
    # edificios de etapas anteriores no las tenían cargadas.
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    classrooms = relationship("Classroom", back_populates="building")


class Classroom(Base):
    __tablename__ = "classrooms"
    __table_args__ = (UniqueConstraint("building_id", "codigo", name="uq_classroom_building_codigo"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String, nullable=False)  # ej: "A-204"
    building_id = Column(UUID(as_uuid=True), ForeignKey("buildings.id"), nullable=False)
    capacidad = Column(Integer, nullable=True)

    building = relationship("Building", back_populates="classrooms")
    schedule_slots = relationship("ScheduleSlot", back_populates="classroom")


class Career(Base):
    __tablename__ = "careers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    codigo = Column(String, unique=True, nullable=False)

    subjects = relationship("Subject", back_populates="career")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    codigo = Column(String, unique=True, nullable=False)
    career_id = Column(UUID(as_uuid=True), ForeignKey("careers.id"), nullable=False)

    career = relationship("Career", back_populates="subjects")
    commissions = relationship("Commission", back_populates="subject")


class Commission(Base):
    __tablename__ = "commissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String, nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    teacher_profile_id = Column(UUID(as_uuid=True), ForeignKey("teacher_profiles.id"), nullable=True)
    estado = Column(Enum(CommissionStatus), nullable=False, default=CommissionStatus.ACTIVA)

    subject = relationship("Subject", back_populates="commissions")
    teacher_profile = relationship("TeacherProfile", back_populates="commissions")
    schedule_slots = relationship("ScheduleSlot", back_populates="commission")
    enrollments = relationship("Enrollment", back_populates="commission")


class ScheduleSlot(Base):
    __tablename__ = "schedule_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commission_id = Column(UUID(as_uuid=True), ForeignKey("commissions.id"), nullable=False)
    classroom_id = Column(UUID(as_uuid=True), ForeignKey("classrooms.id"), nullable=False)
    dia = Column(Enum(DayOfWeek), nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)

    commission = relationship("Commission", back_populates="schedule_slots")
    classroom = relationship("Classroom", back_populates="schedule_slots")
