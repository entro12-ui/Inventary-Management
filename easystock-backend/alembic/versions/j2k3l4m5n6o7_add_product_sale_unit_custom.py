"""add_product_sale_unit_custom

Revision ID: j2k3l4m5n6o7
Revises: i1j2k3l4m5n6
Create Date: 2026-09-19

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "j2k3l4m5n6o7"
down_revision = "i1j2k3l4m5n6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("sale_unit_custom", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "sale_unit_custom")
