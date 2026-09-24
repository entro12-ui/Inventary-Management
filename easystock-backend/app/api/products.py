from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_company_user, get_db_session
from app.models import Store, StoreInventory
from app.models.business import Business
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter()


@router.get("", response_model=list[ProductResponse])
@router.get("/", response_model=list[ProductResponse])
def list_products(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    store_id: UUID | None = Query(default=None),
    expiring: bool = Query(default=False, description="Only products expiring within 30 days or already expired"),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> list[ProductResponse]:
    from datetime import datetime, timedelta, timezone

    query = db.query(Product).filter(Product.business_id == current_user.business_id)
    if expiring:
        soon_cutoff = datetime.now(timezone.utc) + timedelta(days=30)
        query = query.filter(
            Product.expiry_date.isnot(None),
            Product.expiry_date <= soon_cutoff,
            Product.quantity > 0,
        )
    if expiring:
        query = query.order_by(Product.expiry_date.asc().nullslast())
    else:
        query = query.order_by(Product.name.asc())
    products = query.offset(skip).limit(limit).all()
    if store_id:
        store = db.get(Store, store_id)
        if not store or store.business_id != current_user.business_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
        product_ids = [p.id for p in products]
        if not product_ids:
            return []
        inv_rows = (
            db.query(StoreInventory.product_id, StoreInventory.quantity)
            .filter(StoreInventory.store_id == store_id, StoreInventory.product_id.in_(product_ids))
            .all()
        )
        inv_map = {pid: qty for pid, qty in inv_rows}
        result = []
        for p in products:
            data = ProductResponse.model_validate(p)
            result.append(data.model_copy(update={"quantity": inv_map.get(p.id, 0) or 0}))
        return result
    store_ids = [r[0] for r in db.query(Store.id).filter(Store.business_id == current_user.business_id, Store.is_active == True).all()]
    if store_ids:
        product_ids = [p.id for p in products]
        inv_rows = (
            db.query(StoreInventory.product_id, func.coalesce(func.sum(StoreInventory.quantity), 0).label("qty"))
            .filter(StoreInventory.product_id.in_(product_ids), StoreInventory.store_id.in_(store_ids))
            .group_by(StoreInventory.product_id)
            .all()
        )
        inv_map = {pid: int(qty or 0) for pid, qty in inv_rows}
        return [
            ProductResponse.model_validate(p).model_copy(update={"quantity": inv_map.get(p.id, p.quantity or 0)})
            for p in products
        ]
    return [ProductResponse.model_validate(product) for product in products]


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ProductResponse:
    existing = (
        db.query(Product)
        .filter(Product.business_id == current_user.business_id, Product.sku == payload.sku)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")

    business = db.get(Business, current_user.business_id)
    min_stock = (
        payload.min_stock
        if payload.min_stock is not None
        else int(getattr(business, "default_min_stock", None) or 10)
    )

    product = Product(
        business_id=current_user.business_id,
        name=payload.name,
        sku=payload.sku,
        barcode=payload.barcode,
        part_no=payload.part_no,
        batch_no=payload.batch_no,
        location=payload.location,
        image_url=payload.image_url,
        min_stock=min_stock,
        sale_unit=payload.sale_unit or "piece",
        sale_unit_custom=payload.sale_unit_custom if (payload.sale_unit or "piece") == "other" else None,
        cost_price=payload.cost_price,
        selling_price=payload.selling_price,
        quantity=payload.quantity,
        expiry_date=payload.expiry_date,
    )
    db.add(product)
    db.flush()
    if (payload.quantity or 0) > 0:
        target_store = None
        if payload.store_id:
            store = db.get(Store, payload.store_id)
            if store and store.business_id == current_user.business_id and store.is_active:
                target_store = store
        if not target_store:
            target_store = (
                db.query(Store)
                .filter(Store.business_id == current_user.business_id, Store.is_active == True)
                .order_by(Store.name.asc())
                .first()
            )
        if target_store:
            db.add(
                StoreInventory(
                    product_id=product.id,
                    store_id=target_store.id,
                    quantity=payload.quantity or 0,
                )
            )
    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ProductResponse:
    product = db.get(Product, product_id)
    if not product or product.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "sale_unit" in update_data or "sale_unit_custom" in update_data:
        next_unit = update_data.get("sale_unit", product.sale_unit) or "piece"
        next_custom = update_data.get(
            "sale_unit_custom",
            product.sale_unit_custom if "sale_unit_custom" not in update_data else None,
        )
        if "sale_unit_custom" in update_data and isinstance(next_custom, str):
            next_custom = next_custom.strip() or None
        if next_unit == "other" and not next_custom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Choose a custom unit when Sold as is Other",
            )
        if next_unit != "other":
            update_data["sale_unit_custom"] = None
        else:
            update_data["sale_unit_custom"] = next_custom
        update_data["sale_unit"] = next_unit

    for field_name, field_value in update_data.items():
        setattr(product, field_name, field_value)

    if "quantity" in update_data:
        first_store = (
            db.query(Store)
            .filter(Store.business_id == current_user.business_id, Store.is_active == True)
            .order_by(Store.name.asc())
            .first()
        )
        if first_store:
            inv = (
                db.query(StoreInventory)
                .filter(
                    StoreInventory.product_id == product_id,
                    StoreInventory.store_id == first_store.id,
                )
                .first()
            )
            new_qty = update_data["quantity"]
            if inv:
                inv.quantity = new_qty
            else:
                db.add(
                    StoreInventory(
                        product_id=product_id,
                        store_id=first_store.id,
                        quantity=new_qty,
                    )
                )
            total_inv = (
                db.query(func.coalesce(func.sum(StoreInventory.quantity), 0))
                .filter(StoreInventory.product_id == product_id)
                .scalar()
            )
            product.quantity = int(total_inv or 0)
        else:
            product.quantity = update_data["quantity"]

    db.commit()
    db.refresh(product)
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> None:
    product = db.get(Product, product_id)
    if not product or product.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    db.delete(product)
    db.commit()
