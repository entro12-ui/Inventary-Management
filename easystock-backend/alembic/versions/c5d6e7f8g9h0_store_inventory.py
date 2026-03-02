"""store_inventory for per-store quantities

Revision ID: c5d6e7f8g9h0
Revises: b4c5d6e7f8g9
Create Date: 2026-02-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "c5d6e7f8g9h0"
down_revision = "b4c5d6e7f8g9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "store_inventory",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("store_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "store_id", name="unique_product_store_inventory"),
    )
    op.create_index("idx_store_inventory_product", "store_inventory", ["product_id"], unique=False)
    op.create_index("idx_store_inventory_store", "store_inventory", ["store_id"], unique=False)

    conn = op.get_bind()
    conn.execute(
        sa.text("""
            INSERT INTO store_inventory (id, product_id, store_id, quantity)
            SELECT gen_random_uuid(), p.id, (
                SELECT s.id FROM stores s WHERE s.business_id = p.business_id ORDER BY s.name LIMIT 1
            ), p.quantity
            FROM products p
            WHERE p.quantity > 0
            AND EXISTS (SELECT 1 FROM stores s WHERE s.business_id = p.business_id)
        """)
    )


def downgrade() -> None:
    op.drop_index("idx_store_inventory_store", table_name="store_inventory")
    op.drop_index("idx_store_inventory_product", table_name="store_inventory")
    op.drop_table("store_inventory")
