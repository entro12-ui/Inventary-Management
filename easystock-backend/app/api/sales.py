import uuid
from uuid import UUID

import calendar
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi import Depends, HTTPException, status
from fastapi import Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_company_user, get_db_session
from app.models import Store, StoreInventory
from app.models.product import Product
from app.models.sale import PaymentMethod, Sale, SaleItem
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleDetailItemResponse, SaleDetailResponse, SaleItemResponse, SaleResponse
from app.schemas.sales_summary import YearlySalesMonth, YearlySalesSummaryResponse, YearlyTopItem
from app.schemas.credit import CreditSaleResponse
from app.schemas.sale_payment import SalePaymentAdd

router = APIRouter()


def _payment_status_label(total_amount: float, paid_amount: float) -> str:
    if paid_amount <= 0:
        return "UNPAID"
    if paid_amount + 1e-9 < total_amount:
        return "ADVANCE PAYMENT"
    return "FULL PAYMENT"


@router.get("/credit", response_model=list[CreditSaleResponse])
def list_credit_sales(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> list[CreditSaleResponse]:
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == current_user.business_id, Sale.payment_method == PaymentMethod.CREDIT)
        .order_by(Sale.sale_date.desc())
        .limit(200)
        .all()
    )

    response: list[CreditSaleResponse] = []
    for sale in sales:
        total_amount = float(sale.total_amount or 0)
        paid_amount = float(sale.paid_amount or 0)
        remaining_amount = max(total_amount - paid_amount, 0.0)
        response.append(
            CreditSaleResponse(
                id=sale.id,
                customer_name=sale.customer_name,
                items_count=len(sale.items or []),
                sale_date=sale.sale_date,
                total_amount=total_amount,
                paid_amount=paid_amount,
                remaining_amount=remaining_amount,
                payment_status=_payment_status_label(total_amount, paid_amount),
            )
        )
    return response


@router.get("/{sale_id}", response_model=SaleDetailResponse)
def get_sale_detail(
    sale_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> SaleDetailResponse:
    sale = db.get(Sale, sale_id)
    if not sale or sale.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    store_name = None
    if sale.store_id:
        store = db.get(Store, sale.store_id)
        store_name = store.name if store else None
    sold_by_name = None
    if sale.created_by:
        user = db.get(User, sale.created_by)
        sold_by_name = user.full_name if user else None
    items: list[SaleDetailItemResponse] = []
    for item in sale.items or []:
        product = db.get(Product, item.product_id)
        name = product.name if product else "Unknown"
        image_url = product.image_url if product else None
        sku = product.sku if product else None
        part_no = getattr(product, "part_no", None) if product else None
        qty = float(item.quantity or 0)
        price = float(item.unit_price or 0)
        total = qty * price
        items.append(
            SaleDetailItemResponse(
                product_id=item.product_id,
                product_name=name,
                image_url=image_url,
                sku=sku,
                part_no=part_no,
                quantity=qty,
                unit_price=price,
                total=total,
                store_name=store_name,
            )
        )
    return SaleDetailResponse(
        id=sale.id,
        invoice_number=sale.invoice_number,
        total_amount=float(sale.total_amount or 0),
        items=items,
        customer_name=sale.customer_name,
        customer_phone=sale.customer_phone,
        customer_email=sale.customer_email,
        sale_date=sale.sale_date,
        payment_status=_payment_status_label(float(sale.total_amount or 0), float(sale.paid_amount or 0)),
        payment_method=sale.payment_method,
        sold_by_name=sold_by_name,
        store_name=store_name,
    )


@router.patch("/{sale_id}/payment", response_model=CreditSaleResponse)
def receive_payment(
    sale_id: UUID,
    payload: SalePaymentAdd,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> CreditSaleResponse:
    sale = db.get(Sale, sale_id)
    if not sale or sale.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    # Only meaningful for credit flows; still allow recording payments safely.
    total_amount = float(sale.total_amount or 0)
    paid_amount = float(sale.paid_amount or 0)

    paid_amount = min(total_amount, paid_amount + float(payload.amount))
    sale.paid_amount = paid_amount

    if paid_amount <= 0:
        sale.payment_status = "unpaid"
    elif paid_amount + 1e-9 < total_amount:
        sale.payment_status = "partial"
    else:
        sale.payment_status = "paid"

    db.commit()
    db.refresh(sale)

    remaining_amount = max(total_amount - paid_amount, 0.0)
    return CreditSaleResponse(
        id=sale.id,
        customer_name=sale.customer_name,
        items_count=len(sale.items or []),
        sale_date=sale.sale_date,
        total_amount=total_amount,
        paid_amount=paid_amount,
        remaining_amount=remaining_amount,
        payment_status=_payment_status_label(total_amount, paid_amount),
    )


@router.get("/summary/year", response_model=YearlySalesSummaryResponse)
def yearly_summary(
    year: int | None = Query(default=None, ge=2000, le=2100),
    months: int = Query(default=6, ge=1, le=12),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> YearlySalesSummaryResponse:
    now = datetime.now(timezone.utc)
    selected_year = year or now.year

    start = datetime(selected_year, 1, 1, tzinfo=timezone.utc)
    end = datetime(selected_year + 1, 1, 1, tzinfo=timezone.utc)

    month_rows = (
        db.query(
            func.extract("month", Sale.sale_date).label("month"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("total_amount"),
        )
        .filter(
            Sale.business_id == current_user.business_id,
            Sale.sale_date >= start,
            Sale.sale_date < end,
        )
        .group_by(func.extract("month", Sale.sale_date))
        .order_by(func.extract("month", Sale.sale_date))
        .all()
    )

    totals_by_month: dict[int, float] = {int(r.month): float(r.total_amount or 0) for r in month_rows}

    end_month = 12 if selected_year != now.year else now.month
    start_month = max(1, end_month - months + 1)
    month_range = list(range(start_month, end_month + 1))

    month_data = [
        YearlySalesMonth(
            month=m,
            label=calendar.month_name[m],
            total_amount=float(totals_by_month.get(m, 0.0)),
        )
        for m in month_range
    ]

    top_rows = (
        db.query(
            SaleItem.product_id,
            Product.name,
            Product.sku,
            Product.barcode,
            Product.image_url,
            func.coalesce(func.sum(SaleItem.quantity), 0).label("qty"),
            func.coalesce(func.sum(SaleItem.subtotal), 0).label("amount"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(Product, Product.id == SaleItem.product_id)
        .filter(
            Sale.business_id == current_user.business_id,
            Sale.sale_date >= start,
            Sale.sale_date < end,
        )
        .group_by(SaleItem.product_id, Product.name, Product.sku, Product.barcode, Product.image_url)
        .order_by(func.coalesce(func.sum(SaleItem.subtotal), 0).desc())
        .limit(20)
        .all()
    )

    top_items = [
        YearlyTopItem(
            product_id=row.product_id,
            name=row.name,
            sku=row.sku,
            barcode=row.barcode,
            image_url=row.image_url,
            qty=int(row.qty or 0),
            amount=float(row.amount or 0),
        )
        for row in top_rows
    ]

    return YearlySalesSummaryResponse(
        year=selected_year,
        months=month_data,
        top_items=top_items,
        currency=settings.DEFAULT_CURRENCY,
    )


@router.get("", response_model=list[SaleResponse])
@router.get("/", response_model=list[SaleResponse])
def list_sales(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> list[SaleResponse]:
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == current_user.business_id)
        .order_by(Sale.sale_date.desc(), Sale.invoice_number.desc())
        .limit(200)
        .all()
    )
    response: list[SaleResponse] = []
    for sale in sales:
        items = [
            SaleItemResponse(product_id=item.product_id, quantity=item.quantity, unit_price=item.unit_price)
            for item in sale.items
        ]
        total_amount = float(sale.total_amount or 0)
        paid_amount = float(sale.paid_amount or 0)
        response.append(
            SaleResponse(
                id=sale.id,
                invoice_number=sale.invoice_number,
                total_amount=total_amount,
                items=items,
                customer_name=sale.customer_name,
                sale_date=sale.sale_date,
                payment_status=_payment_status_label(total_amount, paid_amount),
                payment_method=sale.payment_method,
            )
        )
    return response


def _get_available_quantity(db: Session, product_id: UUID, business_id: UUID) -> int:
    """Use sum(StoreInventory) for business stores if any, else Product.quantity."""
    store_ids = [r[0] for r in db.query(Store.id).filter(Store.business_id == business_id, Store.is_active == True).all()]
    if store_ids:
        total = (
            db.query(func.coalesce(func.sum(StoreInventory.quantity), 0))
            .filter(StoreInventory.product_id == product_id, StoreInventory.store_id.in_(store_ids))
            .scalar()
        )
        if total is not None:
            return int(total)
    product = db.get(Product, product_id)
    return int(product.quantity or 0) if product else 0


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> SaleResponse:
    total_amount = 0.0
    line_items: list[tuple[Product, int, float]] = []

    for item in payload.items:
        product = db.get(Product, item.product_id)
        if not product or product.business_id != current_user.business_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")
        available = _get_available_quantity(db, item.product_id, current_user.business_id)
        if available < item.quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for {product.name} (available: {available})")

        line_total = item.quantity * item.unit_price
        total_amount += line_total
        line_items.append((product, item.quantity, item.unit_price))

    payment_method = payload.payment_method
    if payload.paid_amount is not None:
        paid_amount = float(payload.paid_amount)
    else:
        paid_amount = 0.0 if payment_method == PaymentMethod.CREDIT else float(total_amount)

    if payment_method == PaymentMethod.CREDIT:
        payment_status = "unpaid" if paid_amount <= 0 else ("partial" if paid_amount + 1e-9 < total_amount else "paid")
    else:
        payment_status = "paid"

    invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
    store_id = payload.store_id
    if store_id:
        store = db.get(Store, store_id)
        if not store or store.business_id != current_user.business_id:
            store_id = None
    sale = Sale(
        business_id=current_user.business_id,
        created_by=current_user.id,
        store_id=store_id,
        invoice_number=invoice_number,
        subtotal=total_amount,
        total_amount=total_amount,
        payment_method=payment_method,
        payment_status=payment_status,
        paid_amount=paid_amount,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        notes=payload.notes,
    )
    db.add(sale)
    db.flush()

    created_items: list[SaleItem] = []
    for product, quantity, unit_price in line_items:
        remaining = quantity
        invs = (
            db.query(StoreInventory)
            .join(Store, Store.id == StoreInventory.store_id)
            .filter(
                StoreInventory.product_id == product.id,
                Store.business_id == current_user.business_id,
                Store.is_active == True,
                StoreInventory.quantity > 0,
            )
            .order_by(StoreInventory.quantity.desc())
            .all()
        )
        for inv in invs:
            if remaining <= 0:
                break
            deduct = min(remaining, inv.quantity)
            inv.quantity -= deduct
            remaining -= deduct
        if remaining > 0:
            product.quantity = max(0, (product.quantity or 0) - remaining)
        else:
            total_inv = (
                db.query(func.coalesce(func.sum(StoreInventory.quantity), 0))
                .filter(StoreInventory.product_id == product.id)
                .scalar()
            )
            product.quantity = int(total_inv or 0)
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            cost_price=product.cost_price,
            subtotal=quantity * unit_price,
        )
        db.add(sale_item)
        created_items.append(sale_item)

    db.commit()
    db.refresh(sale)

    return SaleResponse(
        id=sale.id,
        invoice_number=sale.invoice_number,
        total_amount=float(sale.total_amount or 0),
        items=[
            SaleItemResponse(product_id=item.product_id, quantity=item.quantity, unit_price=item.unit_price)
            for item in created_items
        ],
        customer_name=sale.customer_name,
        sale_date=sale.sale_date,
        payment_status=_payment_status_label(float(sale.total_amount or 0), float(sale.paid_amount or 0)),
        payment_method=sale.payment_method,
    )
