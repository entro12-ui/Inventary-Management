"""add_sale_payment_proof

Revision ID: g9h0i1j2k3l4
Revises: f8a9b0c1d2e3
Create Date: 2026-09-19

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "g9h0i1j2k3l4"
down_revision = "f8a9b0c1d2e3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sales", sa.Column("payment_proof_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("sales", "payment_proof_url")
