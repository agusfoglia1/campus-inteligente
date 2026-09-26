"""Script de prueba: crea datos de ejemplo para verificar el modelo completo.

Uso:
    python -m app.db.seed

Requiere que ya hayas corrido las migraciones (alembic upgrade head) y que
exista al menos un usuario estudiante registrado (via /api/v1/auth/register)
para vincularlo a un StudentProfile.
"""
import datetime

from app.db.session import SessionLocal
from app.models.academic import Building, Classroom, Career, Subject, Commission, ScheduleSlot, DayOfWeek
from app.models.profiles import StudentProfile
from app.models.enrollment import Enrollment
from app.models.user import User, UserRole


def run():
    db = SessionLocal()
    try:
        # 1. Edificio y aula
        edificio = Building(nombre="Ingenieria", ubicacion="Campus Norte")
        db.add(edificio)
        db.flush()

        aula = Classroom(codigo="A-204", building_id=edificio.id, capacidad=40)
        db.add(aula)

        # 2. Carrera y materia
        carrera = Career(nombre="Ingenieria en Sistemas", codigo="ISI")
        db.add(carrera)
        db.flush()

        materia = Subject(nombre="Analisis Matematico II", codigo="AM2", career_id=carrera.id)
        db.add(materia)
        db.flush()

        # 3. Comision y horario
        comision = Commission(codigo="Comision 1", subject_id=materia.id)
        db.add(comision)
        db.flush()

        horario = ScheduleSlot(
            commission_id=comision.id,
            classroom_id=aula.id,
            dia=DayOfWeek.VIERNES,
            hora_inicio=datetime.time(14, 0),
            hora_fin=datetime.time(16, 0),
        )
        db.add(horario)

        # 4. Vincular un estudiante existente (el primero que encuentre con role=student)
        user_estudiante = db.query(User).filter(User.role == UserRole.STUDENT).first()
        if user_estudiante:
            existing_profile = (
                db.query(StudentProfile).filter(StudentProfile.user_id == user_estudiante.id).first()
            )
            if not existing_profile:
                perfil = StudentProfile(
                    user_id=user_estudiante.id,
                    legajo="LEG-0001",
                    career_id=carrera.id,
                    anio_ingreso=2024,
                )
                db.add(perfil)
                db.flush()

                inscripcion = Enrollment(student_profile_id=perfil.id, commission_id=comision.id)
                db.add(inscripcion)
                print(f"Estudiante '{user_estudiante.email}' inscripto en {materia.nombre} / {comision.codigo}")
            else:
                print(f"El estudiante '{user_estudiante.email}' ya tenia un perfil, no se duplica.")
        else:
            print("No hay ningun usuario con role='student' todavia. Registra uno con /auth/register primero.")

        db.commit()
        print("Datos de ejemplo creados correctamente.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
