"""product_warehouse_fields

Revision ID: 574ea2ab36de
Revises: b3fd9f86cbb5
Create Date: 2026-02-14 22:07:44.567234

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision = '574ea2ab36de'
down_revision = 'b3fd9f86cbb5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('products', sa.Column('part_no', sa.String(length=100), nullable=True))
    op.add_column('products', sa.Column('location', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'location')
    op.drop_column('products', 'part_no')
