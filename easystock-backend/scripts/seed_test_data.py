#!/usr/bin/env python3
"""Seed local DB with demo data for retail, pharmacy, bakery, and building materials.

Run from easystock-backend:
  source .venv/bin/activate
  python -m scripts.seed_test_data
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash
from app.database import SessionLocal
import uuid

from app.models.full_schema import (
    Business,
    PaymentMethod,
    Product,
    Proforma,
    ProformaItem,
    Sale,
    SaleItem,
    StockTransfer,
    Store,
    StoreInventory,
    User,
    UserRole,
)

PASSWORD = os.environ.get("SEED_PASSWORD", "Test123!")
NOW = datetime.now(timezone.utc)


def upsert_user(db, *, email: str, full_name: str, role: UserRole, business_id, phone: str | None = None) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.full_name = full_name
        user.role = role
        user.business_id = business_id
        user.password_hash = get_password_hash(PASSWORD)
        user.is_active = True
        user.email_verified = True
        user.phone = phone
        return user
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        business_id=business_id,
        password_hash=get_password_hash(PASSWORD),
        is_active=True,
        email_verified=True,
        phone=phone,
    )
    db.add(user)
    db.flush()
    return user


def ensure_business(
    db,
    *,
    name: str,
    email: str,
    phone: str,
    city: str,
    business_type: str = "general",
) -> Business:
    biz = db.query(Business).filter(Business.email == email).first()
    if biz:
        biz.business_type = business_type
        return biz
    biz = Business(
        name=name,
        email=email,
        phone=phone,
        city=city,
        country="Ethiopia",
        currency="ETB",
        is_active=True,
        approval_status="approved",
        max_stores=5,
        max_users=10,
        business_type=business_type,
    )
    db.add(biz)
    db.flush()
    return biz


def ensure_store(db, business_id, name: str, location: str) -> Store:
    store = (
        db.query(Store)
        .filter(Store.business_id == business_id, Store.name == name)
        .first()
    )
    if store:
        return store
    store = Store(
        business_id=business_id,
        name=name,
        location=location,
        is_active=True,
    )
    db.add(store)
    db.flush()
    return store


def add_product(
    db,
    *,
    business_id,
    name: str,
    sku: str,
    cost: float,
    sell: float,
    qty: int,
    barcode: str | None = None,
    batch_no: str | None = None,
    expiry_days: int | None = None,
    min_stock: int = 10,
    location: str | None = None,
    sale_unit: str = "piece",
    sale_unit_custom: str | None = None,
) -> Product:
    existing = db.query(Product).filter(Product.business_id == business_id, Product.sku == sku).first()
    if existing:
        existing.quantity = qty
        existing.cost_price = cost
        existing.selling_price = sell
        existing.batch_no = batch_no
        existing.min_stock = min_stock
        existing.location = location
        existing.sale_unit = sale_unit
        existing.sale_unit_custom = sale_unit_custom if sale_unit == "other" else None
        if expiry_days is not None:
            existing.expiry_date = NOW + timedelta(days=expiry_days)
        return existing

    product = Product(
        business_id=business_id,
        name=name,
        sku=sku,
        barcode=barcode,
        part_no=sku,
        batch_no=batch_no,
        location=location,
        cost_price=cost,
        selling_price=sell,
        quantity=qty,
        min_stock=min_stock,
        sale_unit=sale_unit,
        sale_unit_custom=sale_unit_custom if sale_unit == "other" else None,
        expiry_date=(NOW + timedelta(days=expiry_days)) if expiry_days is not None else None,
        is_active=True,
    )
    db.add(product)
    db.flush()
    return product


def set_inventory(db, product: Product, store: Store, qty: int) -> None:
    row = (
        db.query(StoreInventory)
        .filter(StoreInventory.product_id == product.id, StoreInventory.store_id == store.id)
        .first()
    )
    if row:
        row.quantity = qty
    else:
        db.add(StoreInventory(product_id=product.id, store_id=store.id, quantity=qty))


def add_sale(
    db,
    *,
    business_id,
    store_id,
    created_by,
    invoice: str,
    items: list[tuple[Product, int]],
    payment: PaymentMethod,
    paid_ratio: float = 1.0,
    customer_name: str | None = None,
    customer_phone: str | None = None,
    days_ago: int = 0,
) -> Sale:
    existing = db.query(Sale).filter(Sale.invoice_number == invoice).first()
    if existing:
        return existing

    subtotal = 0.0
    line_rows: list[tuple[Product, int, float]] = []
    for product, qty in items:
        line_total = float(product.selling_price) * qty
        subtotal += line_total
        line_rows.append((product, qty, line_total))

    paid = round(subtotal * paid_ratio, 2)
    status = "paid" if paid >= subtotal else ("partial" if paid > 0 else "unpaid")

    sale = Sale(
        business_id=business_id,
        store_id=store_id,
        created_by=created_by,
        invoice_number=invoice,
        sale_date=NOW - timedelta(days=days_ago),
        customer_name=customer_name,
        customer_phone=customer_phone,
        subtotal=subtotal,
        total_amount=subtotal,
        paid_amount=paid,
        payment_method=payment,
        payment_status=status,
        status="completed",
    )
    db.add(sale)
    db.flush()

    for product, qty, line_total in line_rows:
        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                sold_by=created_by,
                quantity=qty,
                unit_price=float(product.selling_price),
                cost_price=float(product.cost_price),
                subtotal=line_total,
            )
        )
    return sale


def seed_system_admin(db) -> User:
    return upsert_user(
        db,
        email="admin@easystock.com",
        full_name="System Admin",
        role=UserRole.SYSTEM_ADMIN,
        business_id=None,
    )


def seed_pharmacy(db) -> None:
    biz = ensure_business(
        db,
        name="GreenLeaf Pharmacy",
        email="pharmacy@easystock.com",
        phone="+251911000001",
        city="Addis Ababa",
        business_type="pharmacy",
    )
    main = ensure_store(db, biz.id, "Main Branch", "Bole")
    branch = ensure_store(db, biz.id, "Branch 2 - Piassa", "Piassa")

    owner = upsert_user(
        db,
        email="owner@pharmacy.easystock.com",
        full_name="Sara Pharmacy Owner",
        role=UserRole.OWNER,
        business_id=biz.id,
        phone="+251911000010",
    )
    upsert_user(
        db,
        email="manager@pharmacy.easystock.com",
        full_name="Daniel Manager",
        role=UserRole.MANAGER,
        business_id=biz.id,
    )
    upsert_user(
        db,
        email="staff@pharmacy.easystock.com",
        full_name="Hanna Staff",
        role=UserRole.STAFF,
        business_id=biz.id,
    )

    products_spec = [
        # name, sku, cost, sell, qty, barcode, batch, expiry, loc, unit
        ("Paracetamol 500mg", "PH-PARA-500", 8.0, 15.0, 120, "8901001", "LOT-A12", 20, "Shelf A1", "strip"),
        ("Amoxicillin 250mg", "PH-AMOX-250", 25.0, 45.0, 80, "8901002", "LOT-B07", 12, "Shelf A2", "strip"),
        ("Ibuprofen 400mg", "PH-IBU-400", 12.0, 22.0, 60, "8901003", "LOT-C03", 5, "Shelf A3", "strip"),
        ("Vitamin C 1000mg", "PH-VITC-1000", 18.0, 35.0, 40, "8901004", "LOT-D01", 90, "Shelf B1", "bottle"),
        ("Cough Syrup 100ml", "PH-COUGH-100", 30.0, 55.0, 25, "8901005", "LOT-E19", -3, "Shelf B2", "bottle"),
        ("ORS Sachet", "PH-ORS-01", 3.0, 8.0, 200, "8901006", "LOT-F02", 180, "Shelf C1", "other"),
        ("Hand Sanitizer 250ml", "PH-SAN-250", 40.0, 75.0, 8, "8901007", None, 60, "Shelf C2", "bottle"),
        ("Digital Thermometer", "PH-THERM-01", 120.0, 220.0, 15, "8901008", None, None, "Counter", "piece"),
        ("Face Mask Box", "PH-MASK-50", 50.0, 95.0, 0, "8901009", "LOT-G11", 40, "Shelf D1", "box"),
        ("Zinc Tablets", "PH-ZINC-20", 10.0, 20.0, 5, "8901010", "LOT-H08", 25, "Shelf A4", "strip"),
    ]

    products: list[Product] = []
    for name, sku, cost, sell, qty, barcode, batch, expiry, loc, unit in products_spec:
        p = add_product(
            db,
            business_id=biz.id,
            name=name,
            sku=sku,
            cost=cost,
            sell=sell,
            qty=qty,
            barcode=barcode,
            batch_no=batch,
            expiry_days=expiry,
            min_stock=10,
            location=loc,
            sale_unit=unit,
            sale_unit_custom="Sachet" if unit == "other" else None,
        )
        products.append(p)
        # Split inventory across branches
        main_qty = max(0, qty // 2 + qty % 2)
        branch_qty = max(0, qty // 2)
        set_inventory(db, p, main, main_qty)
        set_inventory(db, p, branch, branch_qty)

    # One transfer record
    if not db.query(StockTransfer).filter(StockTransfer.business_id == biz.id).first():
        db.add(
            StockTransfer(
                business_id=biz.id,
                from_store_id=main.id,
                to_store_id=branch.id,
                product_id=products[0].id,
                quantity=10,
                created_by=owner.id,
            )
        )

    add_sale(
        db,
        business_id=biz.id,
        store_id=main.id,
        created_by=owner.id,
        invoice="PH-INV-1001",
        items=[(products[0], 4), (products[5], 6)],
        payment=PaymentMethod.CASH,
        customer_name="Walk-in",
        days_ago=0,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=main.id,
        created_by=owner.id,
        invoice="PH-INV-1002",
        items=[(products[1], 2), (products[3], 1)],
        payment=PaymentMethod.MOBILE,
        customer_name="Abebe T.",
        customer_phone="+251911222333",
        days_ago=2,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=branch.id,
        created_by=owner.id,
        invoice="PH-INV-1003",
        items=[(products[2], 3)],
        payment=PaymentMethod.CREDIT,
        paid_ratio=0.0,
        customer_name="Clinic Partner",
        customer_phone="+251922111000",
        days_ago=5,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=main.id,
        created_by=owner.id,
        invoice="PH-INV-1004",
        items=[(products[7], 1), (products[6], 2)],
        payment=PaymentMethod.CREDIT,
        paid_ratio=0.4,
        customer_name="Hotel Wellness",
        customer_phone="+251933444555",
        days_ago=8,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=main.id,
        created_by=owner.id,
        invoice="PH-INV-1005",
        items=[(products[0], 10)],
        payment=PaymentMethod.CARD,
        days_ago=15,
    )


def seed_shop(db) -> None:
    biz = ensure_business(
        db,
        name="Sunrise Mini Mart",
        email="shop@easystock.com",
        phone="+251911000002",
        city="Adama",
        business_type="retail",
    )
    store = ensure_store(db, biz.id, "Main Warehouse", "Adama Center")

    owner = upsert_user(
        db,
        email="owner@shop.easystock.com",
        full_name="Yonas Shop Owner",
        role=UserRole.OWNER,
        business_id=biz.id,
    )
    upsert_user(
        db,
        email="staff@shop.easystock.com",
        full_name="Lily Cashier",
        role=UserRole.STAFF,
        business_id=biz.id,
    )

    specs = [
        # name, sku, cost, sell, qty, barcode, batch, expiry, sale_unit
        ("Rice 5kg", "SH-RICE-5", 280.0, 350.0, 40, "7702001", None, None, "bag"),
        ("Cooking Oil 1L", "SH-OIL-1", 180.0, 230.0, 55, "7702002", "BCH-01", 120, "liter"),
        ("Sugar 1kg", "SH-SUGAR-1", 70.0, 95.0, 70, "7702003", None, None, "kg"),
        ("Soap Bar", "SH-SOAP-01", 15.0, 28.0, 100, "7702004", None, None, "piece"),
        ("Bottled Water 1L", "SH-WATER-1", 12.0, 20.0, 150, "7702005", "BCH-W2", 45, "bottle"),
        ("Biscuits Pack", "SH-BISC-01", 25.0, 40.0, 6, "7702006", "BCH-B9", 18, "pack"),
        ("Milk 500ml", "SH-MILK-500", 35.0, 48.0, 20, "7702007", "BCH-M3", 7, "bottle"),
        ("Eggs Tray", "SH-EGG-30", 220.0, 280.0, 12, "7702008", None, 14, "other"),
    ]

    products: list[Product] = []
    for name, sku, cost, sell, qty, barcode, batch, expiry, unit in specs:
        p = add_product(
            db,
            business_id=biz.id,
            name=name,
            sku=sku,
            cost=cost,
            sell=sell,
            qty=qty,
            barcode=barcode,
            batch_no=batch,
            expiry_days=expiry,
            min_stock=8,
            sale_unit=unit,
            sale_unit_custom="Tray" if unit == "other" else None,
        )
        products.append(p)
        set_inventory(db, p, store, qty)

    add_sale(
        db,
        business_id=biz.id,
        store_id=store.id,
        created_by=owner.id,
        invoice="SH-INV-2001",
        items=[(products[0], 2), (products[1], 1)],
        payment=PaymentMethod.CASH,
        days_ago=0,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=store.id,
        created_by=owner.id,
        invoice="SH-INV-2002",
        items=[(products[4], 6), (products[3], 3)],
        payment=PaymentMethod.MOBILE,
        customer_name="Neighborhood customer",
        days_ago=1,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=store.id,
        created_by=owner.id,
        invoice="SH-INV-2003",
        items=[(products[0], 5)],
        payment=PaymentMethod.CREDIT,
        paid_ratio=0.0,
        customer_name="Cafe Blue",
        customer_phone="+251944556677",
        days_ago=4,
    )


def seed_bakery(db) -> None:
    biz = ensure_business(
        db,
        name="Golden Crust Bakery",
        email="bakery@easystock.com",
        phone="+251911000003",
        city="Addis Ababa",
        business_type="bakery",
    )
    store = ensure_store(db, biz.id, "Main Oven", "Kazanchis")

    owner = upsert_user(
        db,
        email="owner@bakery.easystock.com",
        full_name="Marta Bakery Owner",
        role=UserRole.OWNER,
        business_id=biz.id,
    )
    upsert_user(
        db,
        email="staff@bakery.easystock.com",
        full_name="Bereket Baker",
        role=UserRole.STAFF,
        business_id=biz.id,
    )

    specs = [
        # name, sku, cost, sell, qty, barcode, batch, expiry, unit, custom, min
        ("White Bread Loaf", "BK-WHITE-01", 25.0, 45.0, 80, "5503001", "OVEN-A", 2, "loaf", None, 15),
        ("Whole Wheat Loaf", "BK-WHEAT-01", 30.0, 55.0, 40, "5503002", "OVEN-A", 2, "loaf", None, 10),
        ("Croissant", "BK-CROIS-01", 12.0, 25.0, 60, "5503003", "OVEN-B", 1, "piece", None, 20),
        ("Chocolate Cake Slice", "BK-CAKE-SL", 35.0, 70.0, 24, "5503004", "OVEN-C", 3, "piece", None, 8),
        ("Birthday Cake (whole)", "BK-CAKE-WH", 280.0, 550.0, 6, "5503005", "OVEN-C", 4, "piece", None, 2),
        ("Flour 50kg Sack", "BK-FLOUR-50", 1800.0, 2200.0, 12, "5503006", None, 180, "bag", None, 3),
        ("Sugar 25kg", "BK-SUGAR-25", 900.0, 1100.0, 8, "5503007", None, None, "bag", None, 2),
        ("Butter 1kg", "BK-BUTTER-1", 280.0, 360.0, 15, "5503008", "DAIRY-1", 20, "kg", None, 4),
        ("Cookie Pack", "BK-COOK-PK", 40.0, 75.0, 5, "5503009", "OVEN-D", 14, "pack", None, 10),
        ("Donut Dozen", "BK-DONUT-12", 80.0, 150.0, 18, "5503010", "OVEN-B", 1, "other", "Dozen", 6),
    ]

    products: list[Product] = []
    for name, sku, cost, sell, qty, barcode, batch, expiry, unit, custom, min_s in specs:
        p = add_product(
            db,
            business_id=biz.id,
            name=name,
            sku=sku,
            cost=cost,
            sell=sell,
            qty=qty,
            barcode=barcode,
            batch_no=batch,
            expiry_days=expiry,
            min_stock=min_s,
            sale_unit=unit,
            sale_unit_custom=custom,
        )
        products.append(p)
        set_inventory(db, p, store, qty)

    add_sale(
        db,
        business_id=biz.id,
        store_id=store.id,
        created_by=owner.id,
        invoice="BK-INV-3001",
        items=[(products[0], 10), (products[2], 6)],
        payment=PaymentMethod.CASH,
        days_ago=0,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=store.id,
        created_by=owner.id,
        invoice="BK-INV-3002",
        items=[(products[4], 1), (products[9], 2)],
        payment=PaymentMethod.MOBILE,
        customer_name="Office party order",
        days_ago=1,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=store.id,
        created_by=owner.id,
        invoice="BK-INV-3003",
        items=[(products[5], 2)],
        payment=PaymentMethod.CREDIT,
        paid_ratio=0.5,
        customer_name="Sister Cafe",
        customer_phone="+251911777888",
        days_ago=3,
    )


def seed_building(db) -> None:
    biz = ensure_business(
        db,
        name="SolidBuild Materials",
        email="building@easystock.com",
        phone="+251911000004",
        city="Hawassa",
        business_type="building",
    )
    yard = ensure_store(db, biz.id, "Main Yard", "Industrial Zone")
    shop = ensure_store(db, biz.id, "Counter Shop", "City Center")

    owner = upsert_user(
        db,
        email="owner@building.easystock.com",
        full_name="Tadesse Hardware Owner",
        role=UserRole.OWNER,
        business_id=biz.id,
    )
    upsert_user(
        db,
        email="staff@building.easystock.com",
        full_name="Kebede Yard Staff",
        role=UserRole.STAFF,
        business_id=biz.id,
    )

    specs = [
        # name, sku, cost, sell, qty, barcode, unit, custom, min, loc
        ("Cement 50kg", "BD-CEM-50", 650.0, 780.0, 200, "6604001", "bag", None, 40, "Yard A"),
        ("Rebar 12mm (6m)", "BD-REBAR-12", 420.0, 520.0, 150, "6604002", "piece", None, 30, "Yard B"),
        ("Hollow Block", "BD-BLOCK-01", 18.0, 28.0, 800, "6604003", "piece", None, 100, "Yard C"),
        ("Corrugated Sheet 3m", "BD-SHEET-3", 350.0, 450.0, 60, "6604004", "sheet", None, 15, "Yard D"),
        ("PVC Pipe 1 inch", "BD-PVC-1", 85.0, 120.0, 90, "6604005", "meter", None, 20, "Shop"),
        ("Electrical Cable 2.5mm", "BD-CABLE-25", 45.0, 70.0, 500, "6604006", "meter", None, 50, "Shop"),
        ("Paint Interior 20L", "BD-PAINT-20", 1800.0, 2400.0, 25, "6604007", "other", "Tin", 5, "Shop"),
        ("Sand (m³)", "BD-SAND-M3", 800.0, 1100.0, 40, "6604008", "other", "Cubic meter", 8, "Yard A"),
        ("Nails 3 inch (kg)", "BD-NAIL-3", 95.0, 140.0, 35, "6604009", "kg", None, 10, "Shop"),
        ("Plywood 18mm", "BD-PLY-18", 1200.0, 1550.0, 4, "6604010", "sheet", None, 6, "Yard D"),
    ]

    products: list[Product] = []
    for name, sku, cost, sell, qty, barcode, unit, custom, min_s, loc in specs:
        p = add_product(
            db,
            business_id=biz.id,
            name=name,
            sku=sku,
            cost=cost,
            sell=sell,
            qty=qty,
            barcode=barcode,
            min_stock=min_s,
            location=loc,
            sale_unit=unit,
            sale_unit_custom=custom,
        )
        products.append(p)
        yard_qty = max(0, qty // 2 + qty % 2)
        shop_qty = max(0, qty // 2)
        set_inventory(db, p, yard, yard_qty)
        set_inventory(db, p, shop, shop_qty)

    add_sale(
        db,
        business_id=biz.id,
        store_id=yard.id,
        created_by=owner.id,
        invoice="BD-INV-4001",
        items=[(products[0], 20), (products[2], 100)],
        payment=PaymentMethod.CASH,
        customer_name="Site contractor",
        days_ago=0,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=shop.id,
        created_by=owner.id,
        invoice="BD-INV-4002",
        items=[(products[4], 15), (products[5], 50), (products[8], 2)],
        payment=PaymentMethod.BANK,
        customer_name="Home renovation",
        days_ago=1,
    )
    add_sale(
        db,
        business_id=biz.id,
        store_id=yard.id,
        created_by=owner.id,
        invoice="BD-INV-4003",
        items=[(products[1], 40), (products[3], 10)],
        payment=PaymentMethod.CREDIT,
        paid_ratio=0.3,
        customer_name="BuildCo PLC",
        customer_phone="+251922333444",
        days_ago=5,
    )

    # Sample open-tender proforma
    existing_pf = db.query(Proforma).filter(Proforma.proforma_number == "PF-2026-0001").first()
    if not existing_pf:
        pf_id = uuid.uuid4()
        line_specs = [
            (products[0], 100, "bag"),
            (products[1], 50, "piece"),
            (products[2], 500, "piece"),
            (products[3], 40, "sheet"),
        ]
        subtotal = 0.0
        item_rows = []
        for idx, (prod, qty, unit) in enumerate(line_specs, start=1):
            price = float(prod.selling_price)
            line_total = qty * price
            subtotal += line_total
            item_rows.append((idx, prod, qty, unit, price, line_total))
        tax_rate = 15.0
        tax_amount = round(subtotal * tax_rate / 100, 2)
        total = round(subtotal + tax_amount, 2)
        pf = Proforma(
            id=pf_id,
            business_id=biz.id,
            created_by=owner.id,
            proforma_number="PF-2026-0001",
            document_type="tender_bid",
            status="sent",
            issue_date=NOW - timedelta(days=2),
            valid_until=NOW + timedelta(days=14),
            issuer_name=biz.name,
            issuer_address=None,
            issuer_city=biz.city,
            issuer_country=biz.country,
            issuer_phone=biz.phone,
            issuer_email=biz.email,
            issuer_logo_url=biz.logo_url,
            issuer_tin="0001234567",
            client_company_name="Hawassa City Administration",
            client_contact_name="Procurement Office",
            client_address="City Hall, Hawassa",
            client_phone="+251462000000",
            client_email="procurement@hawassa.gov.et",
            client_tin="GOV-TIN-01",
            tender_title="Supply of construction materials for road maintenance",
            tender_reference="HCA/RFQ/2026/044",
            tender_closing_date=NOW + timedelta(days=10),
            currency="ETB",
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            discount_amount=0.0,
            total_amount=total,
            payment_terms="Net 30 after delivery and acceptance",
            delivery_terms="Deliver to site within 7 days of LPO",
            notes="Prices include loading at yard. Transport billed separately.",
            terms_and_conditions="This tender bid is valid until the closing date. Not a tax invoice.",
            authorized_name=owner.full_name,
            authorized_title="Owner / General Manager",
            revision=1,
        )
        db.add(pf)
        for idx, prod, qty, unit, price, line_total in item_rows:
            db.add(
                ProformaItem(
                    id=uuid.uuid4(),
                    proforma_id=pf_id,
                    product_id=prod.id,
                    line_no=idx,
                    description=prod.name,
                    sku=prod.sku,
                    unit=unit,
                    quantity=qty,
                    unit_price=price,
                    discount_amount=0.0,
                    line_total=line_total,
                    price_source="catalog",
                )
            )


def seed_pending_company(db) -> None:
    """Pending approval so system admin can test approve flow."""
    email = "pending@newbiz.easystock.com"
    biz = db.query(Business).filter(Business.email == email).first()
    if not biz:
        # Rename legacy .test pending biz if present
        legacy = db.query(Business).filter(Business.email == "pending@newbiz.test").first()
        if legacy:
            legacy.email = email
            biz = legacy
        else:
            biz = Business(
                name="Pending New Store",
                email=email,
                phone="+251911000099",
                city="Bahir Dar",
                country="Ethiopia",
                is_active=False,
                approval_status="pending",
            )
            db.add(biz)
            db.flush()
    owner_email = "owner@pending.easystock.com"
    existing = db.query(User).filter(User.email == owner_email).first()
    if not existing:
        legacy_user = db.query(User).filter(User.email == "owner@pending.test").first()
        if legacy_user:
            legacy_user.email = owner_email
            legacy_user.business_id = biz.id
        else:
            db.add(
                User(
                    email=owner_email,
                    full_name="Pending Owner",
                    role=UserRole.OWNER,
                    business_id=biz.id,
                    password_hash=get_password_hash(PASSWORD),
                    is_active=False,
                    email_verified=False,
                )
            )


def migrate_legacy_emails(db) -> None:
    """Rename reserved .test emails that EmailStr rejects on login."""
    renames = {
        "pharmacy@easystock.test": "pharmacy@easystock.com",
        "shop@easystock.test": "shop@easystock.com",
        "pending@newbiz.test": "pending@newbiz.easystock.com",
        "owner@pharmacy.test": "owner@pharmacy.easystock.com",
        "manager@pharmacy.test": "manager@pharmacy.easystock.com",
        "staff@pharmacy.test": "staff@pharmacy.easystock.com",
        "owner@shop.test": "owner@shop.easystock.com",
        "staff@shop.test": "staff@shop.easystock.com",
        "owner@pending.test": "owner@pending.easystock.com",
    }
    for old, new in renames.items():
        user = db.query(User).filter(User.email == old).first()
        if user and not db.query(User).filter(User.email == new).first():
            user.email = new
        biz = db.query(Business).filter(Business.email == old).first()
        if biz and not db.query(Business).filter(Business.email == new).first():
            biz.email = new


def main() -> None:
    db = SessionLocal()
    try:
        migrate_legacy_emails(db)
        seed_system_admin(db)
        seed_pharmacy(db)
        seed_shop(db)
        seed_bakery(db)
        seed_building(db)
        seed_pending_company(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("Seed complete. Password for all users:", PASSWORD)
    print()
    print("Accounts:")
    print("  System admin : admin@easystock.com")
    print("  Pharmacy     : owner@pharmacy.easystock.com / manager@pharmacy.easystock.com / staff@pharmacy.easystock.com")
    print("  Mini mart    : owner@shop.easystock.com / staff@shop.easystock.com")
    print("  Bakery       : owner@bakery.easystock.com / staff@bakery.easystock.com")
    print("  Building     : owner@building.easystock.com / staff@building.easystock.com")
    print("  Pending biz  : owner@pending.easystock.com (inactive until approved)")


if __name__ == "__main__":
    main()
