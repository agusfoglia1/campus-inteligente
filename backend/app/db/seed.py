"""Carga idempotentemente el catálogo UNRaf y un escenario mínimo de prueba.

Uso: python -m app.db.seed
Requiere que las migraciones estén aplicadas y al menos un usuario estudiante.
"""
import datetime
import json
import re
import unicodedata
from pathlib import Path

from app.db.session import SessionLocal
from app.models.academic import Building, Career, Classroom, Commission, DayOfWeek, ScheduleSlot, Subject
from app.models.enrollment import Enrollment
from app.models.profiles import StudentProfile
from app.models.user import User, UserRole


def _key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def _ensure_catalog(db):
    catalog_path = Path(__file__).resolve().parents[1] / "data" / "unraf_curricula.json"
    programs = json.loads(catalog_path.read_text(encoding="utf-8"))
    careers = db.query(Career).all()
    by_name = {_key(row.nombre): row for row in careers}
    used_codes = {row.codigo.casefold() for row in careers}
    career_by_program = {}

    for program in programs:
        career = by_name.get(_key(program["name"]))
        if not career:
            code = program["code"]
            suffix = 2
            while code.casefold() in used_codes:
                code = f"{program['code']}-{suffix}"
                suffix += 1
            career = Career(nombre=program["name"], codigo=code)
            db.add(career)
            db.flush()
            by_name[_key(career.nombre)] = career
            used_codes.add(code.casefold())
        career_by_program[program["name"]] = career

    subjects = db.query(Subject).all()
    by_subject_name = {(row.career_id, _key(row.nombre)) for row in subjects}
    used_subject_codes = {row.codigo.casefold() for row in subjects}
    for program in programs:
        career = career_by_program[program["name"]]
        for index, name in enumerate(program["subjects"], start=1):
            if (career.id, _key(name)) in by_subject_name:
                continue
            base_code = f"{program['code']}-M{index:03d}"
            code = base_code
            suffix = 2
            while code.casefold() in used_subject_codes:
                code = f"{base_code}-{suffix}"
                suffix += 1
            db.add(Subject(nombre=name, codigo=code, career_id=career.id))
            by_subject_name.add((career.id, _key(name)))
            used_subject_codes.add(code.casefold())
    db.flush()
    return career_by_program


def run():
    db = SessionLocal()
    try:
        careers = _ensure_catalog(db)
        carrera = careers["Ingeniería en Computación"]
        materia = next(
            row for row in db.query(Subject).filter(Subject.career_id == carrera.id).all()
            if _key(row.nombre) == _key("Análisis Matemático II")
        )

        buildings = {_key(row.nombre): row for row in db.query(Building).all()}
        for name, location in (
            ("E1", "Campus UNRaf"),
            ("E2", "Campus UNRaf"),
            ("E4", "Campus UNRaf"),
        ):
            if _key(name) not in buildings:
                building = Building(nombre=name, ubicacion=location)
                db.add(building)
                db.flush()
                buildings[_key(name)] = building
        edificio = buildings[_key("E1")]
        aula = db.query(Classroom).filter(Classroom.building_id == edificio.id, Classroom.codigo == "A-204").first()
        if not aula:
            aula = Classroom(codigo="A-204", building_id=edificio.id, capacidad=40)
            db.add(aula)
            db.flush()

        comision = db.query(Commission).filter(
            Commission.subject_id == materia.id, Commission.codigo == "Comisión de prueba"
        ).first()
        if not comision:
            comision = Commission(codigo="Comisión de prueba", subject_id=materia.id)
            db.add(comision)
            db.flush()

        horario = db.query(ScheduleSlot).filter(
            ScheduleSlot.commission_id == comision.id,
            ScheduleSlot.classroom_id == aula.id,
            ScheduleSlot.dia == DayOfWeek.VIERNES,
            ScheduleSlot.hora_inicio == datetime.time(14, 0),
        ).first()
        if not horario:
            db.add(ScheduleSlot(
                commission_id=comision.id,
                classroom_id=aula.id,
                dia=DayOfWeek.VIERNES,
                hora_inicio=datetime.time(14, 0),
                hora_fin=datetime.time(16, 0),
            ))

        user = db.query(User).filter(User.role == UserRole.STUDENT).order_by(User.email).first()
        if user:
            profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
            if not profile:
                base_legajo = "LEG-DEMO-0001"
                legajo = base_legajo
                suffix = 2
                while db.query(StudentProfile).filter(StudentProfile.legajo == legajo).first():
                    legajo = f"{base_legajo}-{suffix}"
                    suffix += 1
                profile = StudentProfile(
                    user_id=user.id,
                    legajo=legajo,
                    career_id=carrera.id,
                    anio_ingreso=2024,
                )
                db.add(profile)
                db.flush()
            else:
                current_career = db.query(Career).filter(Career.id == profile.career_id).first()
                if current_career and current_career.codigo == "ISI" and _key(current_career.nombre) == "ingenieria en sistemas":
                    profile.career_id = carrera.id
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_profile_id == profile.id,
                Enrollment.commission_id == comision.id,
            ).first()
            if not enrollment:
                db.add(Enrollment(student_profile_id=profile.id, commission_id=comision.id))
            print(f"Perfil de {user.email}: {carrera.nombre}")
        else:
            print("No hay usuarios estudiantes; catálogo académico cargado igualmente.")

        db.commit()
        print(f"Catálogo UNRaf disponible: {len(careers)} carreras/tecnicaturas.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
