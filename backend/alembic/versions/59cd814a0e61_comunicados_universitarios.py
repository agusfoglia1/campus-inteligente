"""agrega comunicados institucionales

Revision ID: 59cd814a0e61
Revises: 7f0b85d13a2c
Create Date: 2026-10-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "59cd814a0e61"
down_revision = "7f0b85d13a2c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "announcements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("titulo", sa.String(length=140), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("publicado", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column(
            "autor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_announcements_created_at", "announcements", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_announcements_created_at", table_name="announcements")
    op.drop_table("announcements")
