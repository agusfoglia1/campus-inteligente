"""agrega estados para solicitudes de aprobación académica

Revision ID: 7f0b85d13a2c
Revises: 3cae46324d1a
Create Date: 2026-10-02
"""
from alembic import op


revision = "7f0b85d13a2c"
down_revision = "3cae46324d1a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE enrollmentstatus ADD VALUE IF NOT EXISTS 'PENDIENTE_APROBACION'")
    op.execute("ALTER TYPE enrollmentstatus ADD VALUE IF NOT EXISTS 'SOLICITUD_RECHAZADA'")


def downgrade() -> None:
    op.execute("ALTER TABLE enrollments ALTER COLUMN estado TYPE text USING estado::text")
    op.execute(
        "UPDATE enrollments SET estado = 'CURSANDO' "
        "WHERE estado IN ('PENDIENTE_APROBACION', 'SOLICITUD_RECHAZADA')"
    )
    op.execute("DROP TYPE enrollmentstatus")
    op.execute(
        "CREATE TYPE enrollmentstatus AS ENUM ('CURSANDO', 'APROBADA', 'DESAPROBADA', 'LIBRE')"
    )
    op.execute(
        "ALTER TABLE enrollments ALTER COLUMN estado TYPE enrollmentstatus "
        "USING estado::enrollmentstatus"
    )
