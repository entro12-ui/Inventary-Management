from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_company_user, get_db_session
from app.models.business import Business
from app.models.product import Product
from app.models.sale import PaymentMethod, Sale
from app.models.user import User

router = APIRouter()

EXPIRING_SOON_DAYS = 30


def _business_min_stock(db: Session, business_id) -> int:
    business = db.get(Business, business_id)
    if business and getattr(business, "default_min_stock", None) is not None:
        return int(business.default_min_stock)
    return settings.DEFAULT_LOW_STOCK_THRESHOLD


@router.get("/summary")
def summary(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> dict:
    min_default = _business_min_stock(db, current_user.business_id)
    total_products = db.query(func.count(Product.id)).filter(Product.business_id == current_user.business_id).scalar() or 0
    low_stock_count = (
        db.query(func.count(Product.id))
        .filter(
            Product.business_id == current_user.business_id,
            Product.quantity > 0,
            Product.quantity <= func.coalesce(Product.low_stock_threshold, min_default),
        )
        .scalar()
        or 0
    )
    out_of_stock_count = (
        db.query(func.count(Product.id))
        .filter(Product.business_id == current_user.business_id, Product.quantity <= 0)
        .scalar()
        or 0
    )
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
    today_sales = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(Sale.business_id == current_user.business_id, Sale.sale_date >= today_start)
        .scalar()
        or 0
    )
    credit_count = (
        db.query(func.count(Sale.id))
        .filter(
            Sale.business_id == current_user.business_id,
            Sale.payment_method == PaymentMethod.CREDIT,
            func.coalesce(Sale.paid_amount, 0) < func.coalesce(Sale.total_amount, 0),
        )
        .scalar()
        or 0
    )
    soon_cutoff = today_start + timedelta(days=EXPIRING_SOON_DAYS)
    expiring_soon_count = (
        db.query(func.count(Product.id))
        .filter(
            Product.business_id == current_user.business_id,
            Product.quantity > 0,
            Product.expiry_date.isnot(None),
            Product.expiry_date <= soon_cutoff,
        )
        .scalar()
        or 0
    )

    return {
        "total_products": int(total_products),
        "low_stock_count": int(low_stock_count),
        "out_of_stock_count": int(out_of_stock_count),
        "today_sales": float(today_sales),
        "credit_count": int(credit_count),
        "expiring_soon_count": int(expiring_soon_count),
        "currency": "ETB",
    }
