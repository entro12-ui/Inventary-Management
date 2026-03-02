from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_company_user, get_db_session
from app.models.product import Product
from app.models.sale import SaleItem
from app.models.user import User

router = APIRouter()


@router.get("/movements")
def stock_movements(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> dict[str, list[dict]]:
    recent_sales = (
        db.query(SaleItem)
        .join(SaleItem.product)
        .filter(Product.business_id == current_user.business_id)
        .order_by(SaleItem.id.desc())
        .limit(20)
        .all()
    )
    movements = [
        {
            "type": "out",
            "product_id": str(item.product_id),
            "product_name": item.product.name if item.product else "Unknown",
            "quantity": item.quantity,
            "reference": "sale",
        }
        for item in recent_sales
    ]
    return {"items": movements}
