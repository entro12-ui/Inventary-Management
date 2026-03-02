"""stock_transfers

Revision ID: a1b2c3d4e5f6
Revises: 8c4a8c2a9d10
Create Date: 2026-02-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
revision = "a1b2c3d4e5f6"
down_revision = "8c4a8c2a9d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stock_transfers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("business_id", sa.UUID(), nullable=False),
        sa.Column("from_store_id", sa.UUID(), nullable=False),
        sa.Column("to_store_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_stock_transfer_business", "stock_transfers", ["business_id"], unique=False)
    op.create_index("idx_stock_transfer_created", "stock_transfers", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_stock_transfer_created", table_name="stock_transfers")
    op.drop_index("idx_stock_transfer_business", table_name="stock_transfers")
    op.drop_table("stock_transfers")
