from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from sqlalchemy import func

from app.core.dependencies import get_company_user, get_db_session
from app.models import Product, StockTransfer, Store, StoreInventory
from app.models.user import User
from app.schemas.transfer import TransferCreate, TransferResponse

router = APIRouter()


@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    payload: TransferCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> TransferResponse:
    if payload.from_store_id == payload.to_store_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="From and to store must be different")

    from_store = db.get(Store, payload.from_store_id)
    to_store = db.get(Store, payload.to_store_id)
    if not from_store or from_store.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="From store not found")
    if not to_store or to_store.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="To store not found")

    product = db.get(Product, payload.product_id)
    if not product or product.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    from_inv = (
        db.query(StoreInventory)
        .filter(
            StoreInventory.product_id == payload.product_id,
            StoreInventory.store_id == payload.from_store_id,
        )
        .first()
    )
    if not from_inv:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No stock in source store. Add stock to the source store first.",
        )

    available = from_inv.quantity or 0
    if available < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock in source store. Available: {available}",
        )

    from_inv.quantity = (from_inv.quantity or 0) - payload.quantity

    to_inv = (
        db.query(StoreInventory)
        .filter(
            StoreInventory.product_id == payload.product_id,
            StoreInventory.store_id == payload.to_store_id,
        )
        .first()
    )
    if not to_inv:
        to_inv = StoreInventory(
            product_id=payload.product_id,
            store_id=payload.to_store_id,
            quantity=payload.quantity,
        )
        db.add(to_inv)
    else:
        to_inv.quantity = (to_inv.quantity or 0) + payload.quantity

    total = (
        db.query(func.coalesce(func.sum(StoreInventory.quantity), 0))
        .filter(StoreInventory.product_id == payload.product_id)
        .scalar()
    )
    product.quantity = int(total or 0)

    transfer = StockTransfer(
        business_id=current_user.business_id,
        from_store_id=payload.from_store_id,
        to_store_id=payload.to_store_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        created_by=current_user.id,
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return TransferResponse.model_validate(transfer)
