"""saas_system_admin_and_roles

Revision ID: d6e7f8g9h0i1
Revises: c5d6e7f8g9h0
Create Date: 2026-02-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "d6e7f8g9h0i1"
down_revision = "c5d6e7f8g9h0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'SYSTEM_ADMIN'")
    op.alter_column(
        "users",
        "business_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "business_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
    # Cannot remove enum value in PostgreSQL easily
