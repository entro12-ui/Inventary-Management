"""add_proformas

Revision ID: l4m5n6o7p8q9
Revises: k3l4m5n6o7p8
Create Date: 2026-09-24

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "l4m5n6o7p8q9"
down_revision = "k3l4m5n6o7p8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "proformas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("proforma_number", sa.String(100), unique=True, nullable=False),
        sa.Column("document_type", sa.String(30), nullable=False, server_default="quotation"),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("issue_date", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issuer_name", sa.String(200), nullable=False),
        sa.Column("issuer_address", sa.Text(), nullable=True),
        sa.Column("issuer_city", sa.String(100), nullable=True),
        sa.Column("issuer_country", sa.String(100), nullable=True),
        sa.Column("issuer_phone", sa.String(50), nullable=True),
        sa.Column("issuer_email", sa.String(200), nullable=True),
        sa.Column("issuer_logo_url", sa.String(500), nullable=True),
        sa.Column("issuer_tin", sa.String(100), nullable=True),
        sa.Column("client_company_name", sa.String(200), nullable=False),
        sa.Column("client_contact_name", sa.String(200), nullable=True),
        sa.Column("client_address", sa.Text(), nullable=True),
        sa.Column("client_phone", sa.String(50), nullable=True),
        sa.Column("client_email", sa.String(200), nullable=True),
        sa.Column("client_tin", sa.String(100), nullable=True),
        sa.Column("tender_title", sa.String(300), nullable=True),
        sa.Column("tender_reference", sa.String(150), nullable=True),
        sa.Column("tender_closing_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("currency", sa.String(10), server_default="ETB"),
        sa.Column("subtotal", sa.Float(), nullable=False, server_default="0"),
        sa.Column("tax_rate", sa.Float(), server_default="0"),
        sa.Column("tax_amount", sa.Float(), server_default="0"),
        sa.Column("discount_amount", sa.Float(), server_default="0"),
        sa.Column("total_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("payment_terms", sa.Text(), nullable=True),
        sa.Column("delivery_terms", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("terms_and_conditions", sa.Text(), nullable=True),
        sa.Column("authorized_name", sa.String(200), nullable=True),
        sa.Column("authorized_title", sa.String(200), nullable=True),
        sa.Column("stamp_url", sa.String(500), nullable=True),
        sa.Column("signature_url", sa.String(500), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_proforma_business", "proformas", ["business_id"])
    op.create_index("idx_proforma_number", "proformas", ["proforma_number"])
    op.create_index("idx_proforma_status", "proformas", ["status"])
    op.create_index("idx_proforma_issue", "proformas", ["issue_date"])

    op.create_table(
        "proforma_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("proforma_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("proformas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("line_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("sku", sa.String(100), nullable=True),
        sa.Column("unit", sa.String(50), server_default="piece"),
        sa.Column("quantity", sa.Float(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Float(), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Float(), server_default="0"),
        sa.Column("line_total", sa.Float(), nullable=False, server_default="0"),
        sa.Column("price_source", sa.String(20), server_default="catalog"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_proforma_item_proforma", "proforma_items", ["proforma_id"])
    op.create_index("idx_proforma_item_product", "proforma_items", ["product_id"])


def downgrade() -> None:
    op.drop_table("proforma_items")
    op.drop_table("proformas")
