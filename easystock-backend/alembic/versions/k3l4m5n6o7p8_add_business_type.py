"""add_business_type

Revision ID: k3l4m5n6o7p8
Revises: j2k3l4m5n6o7
Create Date: 2026-09-24

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "k3l4m5n6o7p8"
down_revision = "j2k3l4m5n6o7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("business_type", sa.String(length=30), nullable=False, server_default="general"),
    )


def downgrade() -> None:
    op.drop_column("businesses", "business_type")
