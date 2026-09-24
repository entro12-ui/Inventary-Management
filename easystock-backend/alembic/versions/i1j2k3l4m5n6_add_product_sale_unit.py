"""add_product_sale_unit

Revision ID: i1j2k3l4m5n6
Revises: h0i1j2k3l4m5
Create Date: 2026-09-19

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "i1j2k3l4m5n6"
down_revision = "h0i1j2k3l4m5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("sale_unit", sa.String(length=20), nullable=False, server_default="piece"),
    )


def downgrade() -> None:
    op.drop_column("products", "sale_unit")
