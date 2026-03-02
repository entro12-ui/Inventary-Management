import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    """Values must match PostgreSQL userrole enum exactly."""
    SYSTEM_ADMIN = "system_admin"
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    STAFF = "STAFF"


class MovementType(str, enum.Enum):
    IN = "in"
    OUT = "out"
    ADJUSTMENT = "adjustment"
    RETURN = "return"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    MOBILE = "mobile_money"
    BANK = "bank_transfer"
    CARD = "card"
    CREDIT = "credit"


class StockStatus(str, enum.Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    OVERSTOCK = "overstock"


class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=True)
    phone = Column(String(50))
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100), default="Ethiopia")
    currency = Column(String(10), default="ETB")
    tax_rate = Column(Float, default=0.0)
    logo_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    approval_status = Column(String(20), default="approved")
    subscription_tier = Column(String(50), default="free")
    subscription_expiry = Column(DateTime, nullable=True)
    max_users = Column(Integer, default=5)
    max_stores = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    users = relationship("User", back_populates="business", cascade="all, delete-orphan")
    stores = relationship("Store", back_populates="business", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="business", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="business", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="business", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="business", cascade="all, delete-orphan")
    purchase_orders = relationship("PurchaseOrder", back_populates="business", cascade="all, delete-orphan")
    inventory_counts = relationship("InventoryCount", back_populates="business", cascade="all, delete-orphan")
    sales_predictions = relationship("SalesPrediction", back_populates="business", cascade="all, delete-orphan")
    reorder_suggestions = relationship("ReorderSuggestion", back_populates="business", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_business_email", "email"),
        Index("idx_business_created", "created_at"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True)
    email = Column(String(200), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]),
        default=UserRole.STAFF,
    )
    phone = Column(String(50))
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(200))
    reset_password_token = Column(String(200))
    reset_password_expires = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    business = relationship("Business", back_populates="users")
    store_assignments = relationship("UserStore", back_populates="user", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="user")
    sales_created = relationship("Sale", back_populates="created_by_user")
    sale_items_sold = relationship("SaleItem", back_populates="sold_by_user")

    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_business", "business_id"),
        Index("idx_user_role", "role"),
    )


class Store(Base):
    __tablename__ = "stores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    location = Column(String(500))
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(200))
    manager_name = Column(String(200))
    is_active = Column(Boolean, default=True)
    opening_time = Column(String(10))
    closing_time = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    business = relationship("Business", back_populates="stores")
    user_assignments = relationship("UserStore", back_populates="store", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="store")
    store_inventory = relationship("StoreInventory", back_populates="store", cascade="all, delete-orphan")
    inventory_counts = relationship("InventoryCount", back_populates="store", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="store")

    __table_args__ = (
        Index("idx_store_business", "business_id"),
        Index("idx_store_name", "name"),
    )


class UserStore(Base):
    __tablename__ = "user_stores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="store_assignments")
    store = relationship("Store", back_populates="user_assignments")

    __table_args__ = (
        Index("idx_user_store_user", "user_id"),
        Index("idx_user_store_store", "store_id"),
        UniqueConstraint("user_id", "store_id", name="unique_user_store"),
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    image_url = Column(String(500))
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    business = relationship("Business", back_populates="categories")
    parent = relationship("Category", remote_side=[id], backref="subcategories")
    products = relationship("Product", back_populates="category")

    __table_args__ = (
        Index("idx_category_business", "business_id"),
        Index("idx_category_parent", "parent_id"),
        UniqueConstraint("business_id", "name", name="unique_category_name_per_business"),
    )


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    contact_person = Column(String(200))
    email = Column(String(200))
    phone = Column(String(50))
    alternate_phone = Column(String(50))
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100))
    tax_id = Column(String(100))
    payment_terms = Column(String(200))
    website = Column(String(200))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    business = relationship("Business", back_populates="suppliers")
    products = relationship("Product", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

    __table_args__ = (
        Index("idx_supplier_business", "business_id"),
        Index("idx_supplier_name", "name"),
        UniqueConstraint("business_id", "email", name="unique_supplier_email"),
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(200), nullable=False)
    description = Column(Text)
    sku = Column(String(100), nullable=False)
    barcode = Column(String(100), unique=True, nullable=True)
    part_no = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    qr_code = Column(String(500))

    cost_price = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=False, default=0.0)
    wholesale_price = Column(Float, nullable=True)
    discount_price = Column(Float, nullable=True)
    tax_rate = Column(Float, default=0.0)

    quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, default=0)
    available_quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    reorder_point = Column(Integer, nullable=True)
    maximum_stock_level = Column(Integer, nullable=True)

    @property
    def min_stock(self) -> int:
        return int(self.low_stock_threshold or 0)

    @min_stock.setter
    def min_stock(self, value: int) -> None:
        self.low_stock_threshold = value

    brand = Column(String(100))
    size = Column(String(50))
    color = Column(String(50))
    weight = Column(Float)
    weight_unit = Column(String(10), default="kg")
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    manufacture_date = Column(DateTime(timezone=True), nullable=True)

    image_url = Column(String(500))
    image_urls = Column(Text)

    status = Column(Enum(StockStatus), default=StockStatus.IN_STOCK)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_taxable = Column(Boolean, default=True)
    is_digital = Column(Boolean, default=False)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    predicted_daily_demand = Column(Float, nullable=True)
    predicted_reorder_date = Column(DateTime(timezone=True), nullable=True)
    confidence_score = Column(Float, nullable=True)
    seasonality_factor = Column(Float, default=1.0)

    business = relationship("Business", back_populates="products")
    store = relationship("Store", back_populates="products")
    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    stock_transfers = relationship("StockTransfer", back_populates="product", cascade="all, delete-orphan")
    store_inventory = relationship("StoreInventory", back_populates="product", cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="product")
    inventory_counts = relationship("InventoryCountItem", back_populates="product")
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_product_business", "business_id"),
        Index("idx_product_store", "store_id"),
        Index("idx_product_category", "category_id"),
        Index("idx_product_sku", "sku"),
        Index("idx_product_barcode", "barcode"),
        Index("idx_product_status", "status"),
        Index("idx_product_expiry", "expiry_date"),
        UniqueConstraint("business_id", "sku", name="unique_product_sku_per_business"),
    )


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    old_cost_price = Column(Float)
    new_cost_price = Column(Float)
    old_selling_price = Column(Float)
    new_selling_price = Column(Float)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reason = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="price_history")
    user = relationship("User")

    __table_args__ = (
        Index("idx_price_history_product", "product_id"),
        Index("idx_price_history_created", "created_at"),
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    movement_type = Column(Enum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    previous_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)

    reference_type = Column(String(50))
    reference_id = Column(UUID(as_uuid=True), nullable=True)

    note = Column(Text)
    reason = Column(String(500))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="stock_movements")
    business = relationship("Business", back_populates="stock_movements")
    user = relationship("User", back_populates="stock_movements")

    __table_args__ = (
        Index("idx_stock_movement_product", "product_id"),
        Index("idx_stock_movement_business", "business_id"),
        Index("idx_stock_movement_type", "movement_type"),
        Index("idx_stock_movement_created", "created_at"),
        Index("idx_stock_movement_reference", "reference_type", "reference_id"),
    )


class StoreInventory(Base):
    """Per-store product quantity for transfers between branches."""

    __tablename__ = "store_inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="store_inventory")
    store = relationship("Store", back_populates="store_inventory")

    __table_args__ = (
        UniqueConstraint("product_id", "store_id", name="unique_product_store_inventory"),
        Index("idx_store_inventory_product", "product_id"),
        Index("idx_store_inventory_store", "store_id"),
    )


class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    from_store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    to_store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    business = relationship("Business")
    from_store = relationship("Store", foreign_keys=[from_store_id])
    to_store = relationship("Store", foreign_keys=[to_store_id])
    product = relationship("Product", back_populates="stock_transfers")
    created_by_user = relationship("User")

    __table_args__ = (
        Index("idx_stock_transfer_business", "business_id"),
        Index("idx_stock_transfer_created", "created_at"),
    )


class Sale(Base):
    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    invoice_number = Column(String(100), unique=True, nullable=False)
    sale_date = Column(DateTime(timezone=True), server_default=func.now())

    customer_name = Column(String(200))
    customer_email = Column(String(200))
    customer_phone = Column(String(50))
    customer_address = Column(Text)

    subtotal = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    discount_type = Column(String(20))
    total_amount = Column(Float, nullable=False, default=0.0)
    paid_amount = Column(Float, default=0.0)
    change_amount = Column(Float, default=0.0)

    payment_method = Column(Enum(PaymentMethod), nullable=False)
    payment_status = Column(String(50), default="paid")
    transaction_id = Column(String(200))

    status = Column(String(50), default="completed")
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    business = relationship("Business", back_populates="sales")
    store = relationship("Store", back_populates="sales")
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="sales_created")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sale_business", "business_id"),
        Index("idx_sale_store", "store_id"),
        Index("idx_sale_invoice", "invoice_number"),
        Index("idx_sale_date", "sale_date"),
        Index("idx_sale_customer", "customer_email", "customer_phone"),
        Index("idx_sale_payment", "payment_method", "payment_status"),
    )


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    sold_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    subtotal = Column(Float, nullable=False, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
    sold_by_user = relationship("User", foreign_keys=[sold_by], back_populates="sale_items_sold")

    __table_args__ = (
        Index("idx_sale_item_sale", "sale_id"),
        Index("idx_sale_item_product", "product_id"),
    )


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    po_number = Column(String(100), unique=True, nullable=False)
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    expected_delivery_date = Column(DateTime(timezone=True), nullable=True)

    status = Column(String(50), default="draft")

    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    shipping_cost = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    notes = Column(Text)
    terms = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    business = relationship("Business", back_populates="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")
    created_by_user = relationship("User")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    receipts = relationship("PurchaseReceipt", back_populates="purchase_order")

    __table_args__ = (
        Index("idx_po_business", "business_id"),
        Index("idx_po_supplier", "supplier_id"),
        Index("idx_po_number", "po_number"),
        Index("idx_po_status", "status"),
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="purchase_order_items")

    __table_args__ = (
        Index("idx_po_item_po", "purchase_order_id"),
        Index("idx_po_item_product", "product_id"),
    )


class PurchaseReceipt(Base):
    __tablename__ = "purchase_receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    purchase_order_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    received_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    receipt_number = Column(String(100), unique=True)
    received_date = Column(DateTime(timezone=True), server_default=func.now())

    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    purchase_order = relationship("PurchaseOrder", back_populates="receipts")
    receiver = relationship("User")
    items = relationship("PurchaseReceiptItem", back_populates="receipt", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_receipt_po", "purchase_order_id"),
        Index("idx_receipt_number", "receipt_number"),
    )


class PurchaseReceiptItem(Base):
    __tablename__ = "purchase_receipt_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_id = Column(UUID(as_uuid=True), ForeignKey("purchase_receipts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    quantity_received = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    receipt = relationship("PurchaseReceipt", back_populates="items")
    product = relationship("Product")

    __table_args__ = (
        Index("idx_receipt_item_receipt", "receipt_id"),
        Index("idx_receipt_item_product", "product_id"),
    )


class InventoryCount(Base):
    __tablename__ = "inventory_counts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    counted_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    count_number = Column(String(100), unique=True)
    count_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="in_progress")

    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    business = relationship("Business", back_populates="inventory_counts")
    store = relationship("Store", back_populates="inventory_counts")
    counter = relationship("User")
    items = relationship("InventoryCountItem", back_populates="inventory_count", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_inv_count_business", "business_id"),
        Index("idx_inv_count_store", "store_id"),
        Index("idx_inv_count_number", "count_number"),
    )


class InventoryCountItem(Base):
    __tablename__ = "inventory_count_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inventory_count_id = Column(UUID(as_uuid=True), ForeignKey("inventory_counts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    expected_quantity = Column(Integer, nullable=False)
    counted_quantity = Column(Integer, nullable=False)
    variance = Column(Integer, nullable=False)
    variance_reason = Column(String(500))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    inventory_count = relationship("InventoryCount", back_populates="items")
    product = relationship("Product", back_populates="inventory_counts")

    __table_args__ = (
        Index("idx_inv_count_item_count", "inventory_count_id"),
        Index("idx_inv_count_item_product", "product_id"),
    )


class SalesPrediction(Base):
    __tablename__ = "sales_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    prediction_date = Column(DateTime(timezone=True), nullable=False)
    predicted_quantity = Column(Float, nullable=False)
    confidence_lower = Column(Float)
    confidence_upper = Column(Float)

    model_version = Column(String(50))
    features_used = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    business = relationship("Business", back_populates="sales_predictions")
    product = relationship("Product")

    __table_args__ = (
        Index("idx_prediction_business", "business_id"),
        Index("idx_prediction_product", "product_id"),
        Index("idx_prediction_date", "prediction_date"),
        UniqueConstraint("product_id", "prediction_date", name="unique_product_prediction_date"),
    )


class ReorderSuggestion(Base):
    __tablename__ = "reorder_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    suggested_quantity = Column(Integer, nullable=False)
    current_stock = Column(Integer, nullable=False)
    days_until_stockout = Column(Integer)
    reorder_by_date = Column(DateTime(timezone=True))

    priority = Column(String(20))
    status = Column(String(20), default="pending")

    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    acted_upon_at = Column(DateTime(timezone=True), nullable=True)

    business = relationship("Business", back_populates="reorder_suggestions")
    product = relationship("Product")

    __table_args__ = (
        Index("idx_reorder_business", "business_id"),
        Index("idx_reorder_product", "product_id"),
        Index("idx_reorder_priority", "priority"),
        Index("idx_reorder_status", "status"),
    )
