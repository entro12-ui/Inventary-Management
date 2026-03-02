from datetime import date, datetime, timezone

from sqlalchemy import func

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import get_company_user, get_db_session
from app.models.product import Product
from app.models.sale import PaymentMethod, Sale
from app.models.user import User

router = APIRouter()


@router.get("/summary")
def summary(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> dict:
    total_products = db.query(func.count(Product.id)).filter(Product.business_id == current_user.business_id).scalar() or 0
    low_stock_count = (
        db.query(func.count(Product.id))
        .filter(
            Product.business_id == current_user.business_id,
            Product.quantity > 0,
            Product.quantity <= func.coalesce(Product.low_stock_threshold, settings.DEFAULT_LOW_STOCK_THRESHOLD),
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
    total_sales = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(Sale.business_id == current_user.business_id).scalar() or 0
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

    return {
        "total_products": int(total_products),
        "low_stock_count": int(low_stock_count),
        "out_of_stock_count": int(out_of_stock_count),
        "today_sales": float(today_sales),
        "credit_count": int(credit_count),
        "currency": "ETB",
    }
