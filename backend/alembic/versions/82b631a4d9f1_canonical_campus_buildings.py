"""Normalize campus building names to the UNRaf building codes.

Revision ID: 82b631a4d9f1
Revises: 21e8b4c90d72
Create Date: 2026-10-08
"""
import uuid
import unicodedata

from alembic import op
import sqlalchemy as sa


revision = "82b631a4d9f1"
down_revision = "21e8b4c90d72"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    buildings = sa.table(
        "buildings",
        sa.column("id", sa.UUID()),
        sa.column("nombre", sa.String()),
        sa.column("ubicacion", sa.String()),
        sa.column("latitude", sa.Float()),
        sa.column("longitude", sa.Float()),
    )
    aliases = {
        "ingenieria": "E1",
        "ingeniería": "E1",
        "edificio 1": "E1",
        "edificio e1": "E1",
        "edificio laboratorios": "E1",
        "edificio central": "E2",
        "edificio 2": "E2",
        "edificio e2": "E2",
        "edificio 4": "E4",
        "edificio e4": "E4",
        "edificio educacion y aprendizaje": "E4",
    }

    rows = connection.execute(sa.select(buildings)).mappings().all()
    for row in rows:
        normalized = unicodedata.normalize("NFKD", row["nombre"].casefold())
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        normalized = " ".join(normalized.replace("-", " ").split())
        target = aliases.get(normalized)
        if target:
            connection.execute(
                buildings.update().where(buildings.c.id == row["id"]).values(
                    nombre=target,
                    ubicacion="Campus UNRaf",
                )
            )

    rows = connection.execute(sa.select(buildings)).mappings().all()
    names = {row["nombre"].strip().upper() for row in rows}
    for name in ("E1", "E2", "E4"):
        if name not in names:
            connection.execute(buildings.insert().values(
                id=uuid.uuid4(),
                nombre=name,
                ubicacion="Campus UNRaf",
                latitude=None,
                longitude=None,
            ))

def downgrade() -> None:
    # Keep canonical names and their classroom references if the application is
    # rolled back; reversing these data labels would risk misnaming user data.
    pass
