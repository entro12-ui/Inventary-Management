"""backfill default stores for businesses with none

Revision ID: b4c5d6e7f8g9
Revises: a1b2c3d4e5f6
Create Date: 2026-02-28

"""

from __future__ import annotations

import uuid

from alembic import op
import sqlalchemy as sa

revision = "b4c5d6e7f8g9"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Find businesses that have no stores
    result = conn.execute(
        sa.text("""
            SELECT b.id FROM businesses b
            WHERE NOT EXISTS (
                SELECT 1 FROM stores s WHERE s.business_id = b.id
            )
        """)
    )
    rows = result.fetchall()
    for (business_id,) in rows:
        store_id = str(uuid.uuid4())
        conn.execute(
            sa.text(
                "INSERT INTO stores (id, business_id, name, is_active, created_at) "
                "VALUES (:id, :business_id, 'Main Warehouse', true, now())"
            ),
            {"id": store_id, "business_id": str(business_id)},
        )


def downgrade() -> None:
    # Remove stores named "Main Warehouse" that were created by this migration
    # We can't reliably identify them, so we leave stores as-is
    pass
