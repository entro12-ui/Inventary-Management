"""add_credit_payment_method

Revision ID: 61703ad4f221
Revises: 574ea2ab36de
Create Date: 2026-02-14 22:35:05.457042

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = '61703ad4f221'
down_revision = '574ea2ab36de'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'credit'")


def downgrade() -> None:
    # Postgres enums can't easily drop values; leave as-is.
    pass
