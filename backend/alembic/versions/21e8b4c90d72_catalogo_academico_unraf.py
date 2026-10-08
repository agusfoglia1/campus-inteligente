"""Carga carreras y materias publicadas por UNRaf.

Revision ID: 21e8b4c90d72
Revises: 3f4d6a9b2c11
Create Date: 2026-10-08
"""
import json
import re
import unicodedata
import uuid
from pathlib import Path

from alembic import op
import sqlalchemy as sa

revision = "21e8b4c90d72"
down_revision = "3f4d6a9b2c11"
branch_labels = None
depends_on = None


def _key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def upgrade() -> None:
    connection = op.get_bind()
    careers = sa.table(
        "careers",
        sa.column("id", sa.UUID()),
        sa.column("nombre", sa.String()),
        sa.column("codigo", sa.String()),
    )
    subjects = sa.table(
        "subjects",
        sa.column("id", sa.UUID()),
        sa.column("nombre", sa.String()),
        sa.column("codigo", sa.String()),
        sa.column("career_id", sa.UUID()),
    )
    profiles = sa.table(
        "student_profiles",
        sa.column("id", sa.UUID()),
        sa.column("career_id", sa.UUID()),
    )
    commissions = sa.table(
        "commissions",
        sa.column("id", sa.UUID()),
        sa.column("subject_id", sa.UUID()),
    )

    catalog_path = Path(__file__).resolve().parents[2] / "app" / "data" / "unraf_curricula.json"
    programs = json.loads(catalog_path.read_text(encoding="utf-8"))
    career_rows = connection.execute(sa.select(careers)).mappings().all()
    by_career_name = {_key(row["nombre"]): row for row in career_rows}
    by_career_code = {row["codigo"].casefold(): row for row in career_rows}
    career_ids = {}

    for program in programs:
        career = by_career_name.get(_key(program["name"]))
        code = program["code"]
        suffix = 2
        while career is None and code.casefold() in by_career_code:
            existing = by_career_code[code.casefold()]
            if _key(existing["nombre"]) == _key(program["name"]):
                career = existing
                break
            code = f"{program['code']}-{suffix}"
            suffix += 1
        if career is None:
            career = {"id": uuid.uuid4(), "nombre": program["name"], "codigo": code}
            connection.execute(careers.insert().values(**career))
            by_career_name[_key(career["nombre"])] = career
            by_career_code[career["codigo"].casefold()] = career
        career_ids[program["name"]] = career["id"]

    subject_rows = connection.execute(sa.select(subjects)).mappings().all()
    subjects_by_career_name = {(_career_id, _key(name)): row for row in subject_rows
                               for _career_id, name in [(row["career_id"], row["nombre"])]}
    subjects_by_code = {row["codigo"].casefold(): row for row in subject_rows}

    for program in programs:
        career_id = career_ids[program["name"]]
        for index, name in enumerate(program["subjects"], start=1):
            if (career_id, _key(name)) in subjects_by_career_name:
                continue
            base_code = f"{program['code']}-M{index:03d}"
            code = base_code
            suffix = 2
            while code.casefold() in subjects_by_code:
                code = f"{base_code}-{suffix}"
                suffix += 1
            row = {"id": uuid.uuid4(), "nombre": name, "codigo": code, "career_id": career_id}
            connection.execute(subjects.insert().values(**row))
            subjects_by_career_name[(career_id, _key(name))] = row
            subjects_by_code[code.casefold()] = row

    # Corrige el dato ficticio que generaba el seed anterior y conserva sus
    # comisiones apuntándolas a la materia oficial equivalente cuando existe.
    legacy = next((row for row in career_rows
                   if row["codigo"].casefold() == "isi"
                   and _key(row["nombre"]) == "ingenieria en sistemas"), None)
    actual = by_career_name.get(_key("Ingeniería en Computación"))
    if legacy and actual:
        connection.execute(
            profiles.update().where(profiles.c.career_id == legacy["id"])
            .values(career_id=actual["id"])
        )
        legacy_subject_rows = connection.execute(
            sa.select(subjects).where(subjects.c.career_id == legacy["id"])
        ).mappings().all()
        for old_subject in legacy_subject_rows:
            official = subjects_by_career_name.get((actual["id"], _key(old_subject["nombre"])))
            if official:
                connection.execute(
                    commissions.update().where(commissions.c.subject_id == old_subject["id"])
                    .values(subject_id=official["id"])
                )
                connection.execute(subjects.delete().where(subjects.c.id == old_subject["id"]))
        remaining_subject = connection.execute(
            sa.select(subjects.c.id).where(subjects.c.career_id == legacy["id"]).limit(1)
        ).first()
        remaining_profile = connection.execute(
            sa.select(profiles.c.id).where(profiles.c.career_id == legacy["id"]).limit(1)
        ).first()
        if not remaining_subject and not remaining_profile:
            connection.execute(careers.delete().where(careers.c.id == legacy["id"]))


def downgrade() -> None:
    # El catálogo puede estar relacionado con estudiantes, comisiones y
    # asistencias. No borrar registros académicos que ya estén en uso.
    pass
