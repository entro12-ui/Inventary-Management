"""company_approval_flow

Revision ID: e7f8g9h0i1j2
Revises: d6e7f8g9h0i1
Create Date: 2026-02-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "e7f8g9h0i1j2"
down_revision = "d6e7f8g9h0i1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("approval_status", sa.String(20), server_default="approved", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("businesses", "approval_status")
