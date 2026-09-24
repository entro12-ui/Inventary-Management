"""add_product_batch_no

Revision ID: f8a9b0c1d2e3
Revises: e7f8g9h0i1j2
Create Date: 2026-09-19

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "f8a9b0c1d2e3"
down_revision = "e7f8g9h0i1j2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("batch_no", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "batch_no")
