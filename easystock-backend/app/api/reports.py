from __future__ import annotations

import csv
import io
from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_company_user, get_db_session
from app.models import Store, StoreInventory
from app.models.business import Business
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.user import User
from app.schemas.report import (
    BranchInventoryItem,
    BranchInventoryResponse,
    BusinessReportResponse,
    BusinessReportSaleItem,
    NetWorthResponse,
    ProfitLossResponse,
    ReportSummaryResponse,
    RevenueByBranchItem,
    RevenueByBranchResponse,
    SalesListFilteredItem,
)

router = APIRouter()


def _currency(db: Session, current_user: User) -> str:
    business = db.get(Business, current_user.business_id)
    return business.currency if business and business.currency else settings.DEFAULT_CURRENCY


@router.get("/summary", response_model=ReportSummaryResponse)
def summary(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ReportSummaryResponse:
    total_sales = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(Sale.business_id == current_user.business_id)
        .scalar()
        or 0
    )

    total_qty = (
        db.query(func.coalesce(func.sum(SaleItem.quantity), 0))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.business_id == current_user.business_id)
        .scalar()
        or 0
    )

    business = db.get(Business, current_user.business_id)
    business_name = business.name if business else "Business"
    currency = business.currency if business and business.currency else settings.DEFAULT_CURRENCY

    return ReportSummaryResponse(
        business_name=business_name,
        total_sales=float(total_sales),
        total_qty_sold=int(total_qty),
        currency=currency,
    )


@router.get("/profit-loss", response_model=ProfitLossResponse)
def profit_loss(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ProfitLossResponse:
    revenue_row = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(Sale.business_id == current_user.business_id)
        .scalar()
    )
    revenue = float(revenue_row or 0)

    cogs_row = (
        db.query(func.coalesce(func.sum(SaleItem.quantity * SaleItem.cost_price), 0))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.business_id == current_user.business_id)
        .scalar()
    )
    cogs = float(cogs_row or 0)
    gross_profit = revenue - cogs
    currency = _currency(db, current_user)
    return ProfitLossResponse(revenue=revenue, cogs=cogs, gross_profit=gross_profit, currency=currency)


@router.get("/net-worth", response_model=NetWorthResponse)
def net_worth(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> NetWorthResponse:
    row = (
        db.query(func.coalesce(func.sum(Product.quantity * Product.cost_price), 0))
        .filter(Product.business_id == current_user.business_id)
        .scalar()
    )
    inventory_value = float(row or 0)
    qty_row = (
        db.query(func.coalesce(func.sum(Product.quantity), 0))
        .filter(Product.business_id == current_user.business_id)
        .scalar()
    )
    total_qty = float(qty_row or 0)
    currency = _currency(db, current_user)
    return NetWorthResponse(inventory_value=inventory_value, total_qty=total_qty, currency=currency)


@router.get("/revenue-by-branch", response_model=RevenueByBranchResponse)
def revenue_by_branch(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> RevenueByBranchResponse:
    """Shop report: sales per branch. Includes all branches (stores); branches with no sales show 0."""
    stores = db.query(Store).filter(Store.business_id == current_user.business_id, Store.is_active == True).all()
    revenue_rows = (
        db.query(Sale.store_id, func.coalesce(func.sum(Sale.total_amount), 0).label("total"))
        .filter(Sale.business_id == current_user.business_id)
        .group_by(Sale.store_id)
        .all()
    )
    qty_rows = (
        db.query(Sale.store_id, func.coalesce(func.sum(SaleItem.quantity), 0).label("qty"))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.business_id == current_user.business_id)
        .group_by(Sale.store_id)
        .all()
    )
    revenue_map = {r[0]: float(r[1]) for r in revenue_rows}
    qty_map = {r[0]: float(r[1]) for r in qty_rows}
    items = []
    for store in stores:
        items.append(
            RevenueByBranchItem(
                store_id=store.id,
                store_name=store.name,
                total_sales=revenue_map.get(store.id, 0),
                total_qty_sold=qty_map.get(store.id, 0),
            )
        )
    unassigned_total = revenue_map.get(None, 0)
    unassigned_qty = qty_map.get(None, 0)
    if unassigned_total > 0 or unassigned_qty > 0:
        items.insert(
            0,
            RevenueByBranchItem(
                store_id=None,
                store_name="Unassigned (no branch)",
                total_sales=unassigned_total,
                total_qty_sold=unassigned_qty,
            ),
        )
    currency = _currency(db, current_user)
    return RevenueByBranchResponse(items=items, currency=currency)


@router.get("/inventory-by-branch", response_model=BranchInventoryResponse)
def inventory_by_branch(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> BranchInventoryResponse:
    """Per-branch inventory: quantity and total value (cost)."""
    stores = db.query(Store).filter(Store.business_id == current_user.business_id, Store.is_active == True).all()
    items = []
    for store in stores:
        rows = (
            db.query(
                func.coalesce(func.sum(StoreInventory.quantity), 0).label("qty"),
                func.coalesce(func.sum(StoreInventory.quantity * Product.cost_price), 0).label("total"),
            )
            .join(Product, Product.id == StoreInventory.product_id)
            .filter(
                StoreInventory.store_id == store.id,
                Product.business_id == current_user.business_id,
            )
            .first()
        )
        qty = float(rows[0] or 0)
        total = float(rows[1] or 0)
        items.append(
            BranchInventoryItem(
                store_id=store.id,
                store_name=store.name,
                quantity=qty,
                total_amount=total,
            )
        )
    currency = _currency(db, current_user)
    return BranchInventoryResponse(items=items, currency=currency)


@router.get("/business-report", response_model=BusinessReportResponse)
def business_report(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> BusinessReportResponse:
    """Business report: sales items, purchase, sell, profit, due, expense, loss."""
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == current_user.business_id)
        .order_by(Sale.sale_date.desc())
        .limit(500)
        .all()
    )
    sales_items: list[BusinessReportSaleItem] = []
    sell_total = 0.0
    purchase_total = 0.0
    for sale in sales:
        store_name = None
        if sale.store_id:
            store = db.get(Store, sale.store_id)
            store_name = store.name if store else None
        created_by_name = None
        if sale.created_by:
            user = db.get(User, sale.created_by)
            created_by_name = user.full_name if user else None
        for item in sale.items or []:
            product = db.get(Product, item.product_id)
            name = product.name if product else "Unknown"
            qty = float(item.quantity or 0)
            price = float(item.unit_price or 0)
            total = qty * price
            cost = float(item.cost_price or 0) * qty
            sell_total += total
            purchase_total += cost
            sales_items.append(
                BusinessReportSaleItem(
                    product_name=name,
                    customer_name=sale.customer_name,
                    quantity=qty,
                    unit_price=price,
                    total=total,
                    sold_by=created_by_name,
                    branch_name=store_name,
                )
            )
    profit = sell_total - purchase_total
    due = 0.0
    expense_total = 0.0
    loss = 0.0
    currency = _currency(db, current_user)
    return BusinessReportResponse(
        sales_items=sales_items,
        purchase_total=purchase_total,
        sell_total=sell_total,
        profit=profit,
        due=due,
        expense_total=expense_total,
        loss=loss,
        currency=currency,
    )


@router.get("/sales", response_model=list[SalesListFilteredItem])
def sales_filtered(
    store_id: UUID | None = Query(default=None),
    created_by: UUID | None = Query(default=None),
    customer_name: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> list[SalesListFilteredItem]:
    q = (
        db.query(Sale)
        .filter(Sale.business_id == current_user.business_id)
        .order_by(Sale.sale_date.desc())
        .limit(500)
    )
    if store_id is not None:
        q = q.filter(Sale.store_id == store_id)
    if created_by is not None:
        q = q.filter(Sale.created_by == created_by)
    if customer_name and customer_name.strip():
        q = q.filter(Sale.customer_name.ilike(f"%{customer_name.strip()}%"))
    sales = q.all()

    out = []
    for sale in sales:
        store_name = None
        if sale.store_id:
            store = db.get(Store, sale.store_id)
            store_name = store.name if store else None
        created_by_name = None
        if sale.created_by:
            user = db.get(User, sale.created_by)
            created_by_name = user.full_name if user else None
        out.append(
            SalesListFilteredItem(
                id=sale.id,
                invoice_number=sale.invoice_number,
                sale_date=sale.sale_date,
                customer_name=sale.customer_name,
                store_name=store_name,
                created_by_name=created_by_name,
                total_amount=float(sale.total_amount or 0),
                items_count=len(sale.items or []),
            )
        )
    return out


@router.get("/daily-closing")
def daily_closing(
    day: date | None = Query(default=None, description="Closing day (defaults to today UTC)"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> dict:
    """End-of-day sales summary for shops and pharmacies."""
    selected = day or datetime.now(timezone.utc).date()
    start = datetime.combine(selected, datetime.min.time(), tzinfo=timezone.utc)
    end = datetime.combine(selected, datetime.max.time(), tzinfo=timezone.utc)

    business = db.get(Business, current_user.business_id)
    min_default = (
        int(business.default_min_stock)
        if business and getattr(business, "default_min_stock", None) is not None
        else settings.DEFAULT_LOW_STOCK_THRESHOLD
    )

    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == current_user.business_id,
            Sale.sale_date >= start,
            Sale.sale_date <= end,
        )
        .order_by(Sale.sale_date.asc())
        .all()
    )

    by_method: dict[str, float] = {}
    total_sales = 0.0
    total_paid = 0.0
    total_due = 0.0
    for sale in sales:
        amount = float(sale.total_amount or 0)
        paid = float(sale.paid_amount or 0)
        total_sales += amount
        total_paid += paid
        total_due += max(amount - paid, 0.0)
        key = sale.payment_method.value if hasattr(sale.payment_method, "value") else str(sale.payment_method)
        by_method[key] = by_method.get(key, 0.0) + amount

    low_stock = (
        db.query(Product)
        .filter(
            Product.business_id == current_user.business_id,
            Product.quantity > 0,
            Product.quantity <= func.coalesce(Product.low_stock_threshold, min_default),
        )
        .order_by(Product.quantity.asc())
        .limit(20)
        .all()
    )

    return {
        "date": selected.isoformat(),
        "currency": _currency(db, current_user),
        "sales_count": len(sales),
        "total_sales": total_sales,
        "total_paid": total_paid,
        "total_due": total_due,
        "by_payment_method": [
            {"method": method, "amount": amount} for method, amount in sorted(by_method.items())
        ],
        "low_stock_items": [
            {
                "id": str(p.id),
                "name": p.name,
                "sku": p.sku,
                "quantity": int(p.quantity or 0),
                "min_stock": int(p.low_stock_threshold if p.low_stock_threshold is not None else min_default),
            }
            for p in low_stock
        ],
    }


@router.get("/export/sales")
def export_sales(
    format: str = Query(default="csv", regex="^(csv|excel)$"),
    store_id: UUID | None = Query(default=None),
    created_by: UUID | None = Query(default=None),
    customer_name: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
):
    q = (
        db.query(Sale)
        .filter(Sale.business_id == current_user.business_id)
        .order_by(Sale.sale_date.desc())
        .limit(2000)
    )
    if store_id is not None:
        q = q.filter(Sale.store_id == store_id)
    if created_by is not None:
        q = q.filter(Sale.created_by == created_by)
    if customer_name and customer_name.strip():
        q = q.filter(Sale.customer_name.ilike(f"%{customer_name.strip()}%"))
    sales = q.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Invoice", "Date", "Customer", "Branch", "Seller", "Total", "Items Count"])
    for sale in sales:
        store_name = ""
        if sale.store_id:
            store = db.get(Store, sale.store_id)
            store_name = store.name if store else ""
        created_by_name = ""
        if sale.created_by:
            user = db.get(User, sale.created_by)
            created_by_name = user.full_name if user else ""
        date_str = sale.sale_date.strftime("%Y-%m-%d %H:%M") if sale.sale_date else ""
        writer.writerow([
            sale.invoice_number,
            date_str,
            sale.customer_name or "",
            store_name,
            created_by_name,
            f"{sale.total_amount or 0:.2f}",
            len(sale.items or []),
        ])
    buf.seek(0)
    content = buf.getvalue().encode("utf-8-sig")
    media_type = "text/csv"
    filename = "sales_export.csv"
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
