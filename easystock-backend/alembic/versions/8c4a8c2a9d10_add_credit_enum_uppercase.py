"""add_credit_enum_uppercase

Revision ID: 8c4a8c2a9d10
Revises: 61703ad4f221
Create Date: 2026-02-14 23:59:00

"""

from __future__ import annotations

from alembic import op


# revision identifiers, used by Alembic.
revision = "8c4a8c2a9d10"
down_revision = "61703ad4f221"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLAlchemy Enum(PaymentMethod) persists enum *names* by default (e.g. CREDIT),
    # while our initial migration added lowercase 'credit'. Add 'CREDIT' for runtime compatibility.
    op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'CREDIT'")


def downgrade() -> None:
    # Postgres enums can't easily drop values; leave as-is.
    pass
