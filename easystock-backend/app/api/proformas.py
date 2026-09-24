from __future__ import annotations

import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_company_user, get_db_session
from app.models.business import Business
from app.models.full_schema import Proforma, ProformaItem
from app.models.product import Product
from app.models.user import User
from app.schemas.proforma import (
    ProformaCreate,
    ProformaItemCreate,
    ProformaItemResponse,
    ProformaListItem,
    ProformaResponse,
    ProformaStatusUpdate,
    ProformaUpdate,
)

router = APIRouter()


def _next_proforma_number(db: Session, business_id: UUID) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"PF-{year}-"
    last = (
        db.query(Proforma)
        .filter(Proforma.business_id == business_id, Proforma.proforma_number.like(f"{prefix}%"))
        .order_by(Proforma.proforma_number.desc())
        .first()
    )
    seq = 1
    if last and last.proforma_number:
        try:
            seq = int(last.proforma_number.rsplit("-", 1)[-1]) + 1
        except ValueError:
            seq = 1
    return f"{prefix}{seq:04d}"


def _issuer_snapshot(business: Business) -> dict:
    address_parts = [p for p in [business.address, business.city, business.country] if p]
    return {
        "issuer_name": business.name,
        "issuer_address": business.address,
        "issuer_city": business.city,
        "issuer_country": business.country,
        "issuer_phone": business.phone,
        "issuer_email": business.email,
        "issuer_logo_url": business.logo_url,
    }


def _compute_totals(
    items: list[ProformaItemCreate],
    tax_rate: float,
    discount_amount: float,
) -> tuple[float, float, float, list[tuple[ProformaItemCreate, float]]]:
    rows: list[tuple[ProformaItemCreate, float]] = []
    subtotal = 0.0
    for item in items:
        line = max(float(item.quantity) * float(item.unit_price) - float(item.discount_amount or 0), 0.0)
        rows.append((item, line))
        subtotal += line
    discount = min(float(discount_amount or 0), subtotal)
    taxable = max(subtotal - discount, 0.0)
    tax_amount = round(taxable * (float(tax_rate or 0) / 100.0), 2)
    total = round(taxable + tax_amount, 2)
    return round(subtotal, 2), tax_amount, total, rows


def _resolve_items(
    db: Session,
    business_id: UUID,
    items: list[ProformaItemCreate],
) -> list[ProformaItemCreate]:
    resolved: list[ProformaItemCreate] = []
    for raw in items:
        data = raw.model_copy()
        if data.product_id:
            product = db.get(Product, data.product_id)
            if not product or product.business_id != business_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product not found")
            if not data.description.strip():
                data.description = product.name
            if not data.sku:
                data.sku = product.sku
            if data.price_source == "catalog":
                data.unit_price = float(product.selling_price or 0)
            unit = getattr(product, "sale_unit", None) or "piece"
            if unit == "other":
                unit = getattr(product, "sale_unit_custom", None) or "unit"
            if not data.unit or data.unit == "piece":
                data.unit = unit
        resolved.append(data)
    return resolved


def _build_item_rows(
    proforma_id: UUID,
    rows: list[tuple[ProformaItemCreate, float]],
) -> list[ProformaItem]:
    out: list[ProformaItem] = []
    for idx, (item, line_total) in enumerate(rows, start=1):
        out.append(
            ProformaItem(
                id=uuid.uuid4(),
                proforma_id=proforma_id,
                product_id=item.product_id,
                line_no=idx,
                description=item.description.strip(),
                sku=item.sku,
                unit=item.unit or "piece",
                quantity=float(item.quantity),
                unit_price=float(item.unit_price),
                discount_amount=float(item.discount_amount or 0),
                line_total=line_total,
                price_source=item.price_source or "catalog",
            )
        )
    return out


def _to_response(proforma: Proforma, created_by_name: str | None = None) -> ProformaResponse:
    items = sorted(proforma.items or [], key=lambda i: i.line_no or 0)
    return ProformaResponse(
        id=proforma.id,
        proforma_number=proforma.proforma_number,
        document_type=proforma.document_type,
        status=proforma.status,
        issue_date=proforma.issue_date,
        valid_until=proforma.valid_until,
        issuer_name=proforma.issuer_name,
        issuer_address=proforma.issuer_address,
        issuer_city=proforma.issuer_city,
        issuer_country=proforma.issuer_country,
        issuer_phone=proforma.issuer_phone,
        issuer_email=proforma.issuer_email,
        issuer_logo_url=proforma.issuer_logo_url,
        issuer_tin=proforma.issuer_tin,
        client_company_name=proforma.client_company_name,
        client_contact_name=proforma.client_contact_name,
        client_address=proforma.client_address,
        client_phone=proforma.client_phone,
        client_email=proforma.client_email,
        client_tin=proforma.client_tin,
        tender_title=proforma.tender_title,
        tender_reference=proforma.tender_reference,
        tender_closing_date=proforma.tender_closing_date,
        currency=proforma.currency or "ETB",
        subtotal=float(proforma.subtotal or 0),
        tax_rate=float(proforma.tax_rate or 0),
        tax_amount=float(proforma.tax_amount or 0),
        discount_amount=float(proforma.discount_amount or 0),
        total_amount=float(proforma.total_amount or 0),
        payment_terms=proforma.payment_terms,
        delivery_terms=proforma.delivery_terms,
        notes=proforma.notes,
        terms_and_conditions=proforma.terms_and_conditions,
        authorized_name=proforma.authorized_name,
        authorized_title=proforma.authorized_title,
        stamp_url=proforma.stamp_url,
        signature_url=proforma.signature_url,
        revision=int(proforma.revision or 1),
        created_by_name=created_by_name,
        items=[ProformaItemResponse.model_validate(i) for i in items],
    )


@router.get("", response_model=list[ProformaListItem])
def list_proformas(
    status_filter: str | None = Query(default=None, alias="status"),
    document_type: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> list[ProformaListItem]:
    query = db.query(Proforma).filter(Proforma.business_id == current_user.business_id)
    if status_filter:
        query = query.filter(Proforma.status == status_filter)
    if document_type:
        query = query.filter(Proforma.document_type == document_type)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(
            (Proforma.proforma_number.ilike(like))
            | (Proforma.client_company_name.ilike(like))
            | (Proforma.tender_reference.ilike(like))
            | (Proforma.tender_title.ilike(like))
        )
    rows = query.order_by(Proforma.issue_date.desc().nullslast(), Proforma.created_at.desc()).limit(200).all()
    return [
        ProformaListItem(
            id=p.id,
            proforma_number=p.proforma_number,
            document_type=p.document_type,
            status=p.status,
            issue_date=p.issue_date,
            valid_until=p.valid_until,
            client_company_name=p.client_company_name,
            tender_reference=p.tender_reference,
            tender_title=p.tender_title,
            total_amount=float(p.total_amount or 0),
            currency=p.currency or "ETB",
            items_count=len(p.items or []),
            revision=int(p.revision or 1),
        )
        for p in rows
    ]


@router.get("/{proforma_id}", response_model=ProformaResponse)
def get_proforma(
    proforma_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ProformaResponse:
    proforma = db.get(Proforma, proforma_id)
    if not proforma or proforma.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proforma not found")
    created_by_name = None
    if proforma.created_by:
        user = db.get(User, proforma.created_by)
        created_by_name = user.full_name if user else None
    return _to_response(proforma, created_by_name)


@router.post("", response_model=ProformaResponse, status_code=status.HTTP_201_CREATED)
def create_proforma(
    payload: ProformaCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ProformaResponse:
    business = db.get(Business, current_user.business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    items = _resolve_items(db, current_user.business_id, payload.items)
    subtotal, tax_amount, total, rows = _compute_totals(items, payload.tax_rate, payload.discount_amount)

    proforma_id = uuid.uuid4()
    snap = _issuer_snapshot(business)
    proforma = Proforma(
        id=proforma_id,
        business_id=current_user.business_id,
        created_by=current_user.id,
        proforma_number=_next_proforma_number(db, current_user.business_id),
        document_type=payload.document_type,
        status=payload.status or "draft",
        issue_date=payload.issue_date or datetime.now(timezone.utc),
        valid_until=payload.valid_until,
        **snap,
        issuer_tin=payload.issuer_tin,
        client_company_name=payload.client_company_name.strip(),
        client_contact_name=payload.client_contact_name,
        client_address=payload.client_address,
        client_phone=payload.client_phone,
        client_email=payload.client_email,
        client_tin=payload.client_tin,
        tender_title=payload.tender_title,
        tender_reference=payload.tender_reference,
        tender_closing_date=payload.tender_closing_date,
        currency=payload.currency or business.currency or "ETB",
        subtotal=subtotal,
        tax_rate=float(payload.tax_rate or 0),
        tax_amount=tax_amount,
        discount_amount=float(payload.discount_amount or 0),
        total_amount=total,
        payment_terms=payload.payment_terms,
        delivery_terms=payload.delivery_terms,
        notes=payload.notes,
        terms_and_conditions=payload.terms_and_conditions,
        authorized_name=payload.authorized_name or current_user.full_name,
        authorized_title=payload.authorized_title,
        stamp_url=payload.stamp_url,
        signature_url=payload.signature_url,
        revision=1,
    )
    db.add(proforma)
    for row in _build_item_rows(proforma_id, rows):
        db.add(row)
    db.commit()
    db.refresh(proforma)
    return _to_response(proforma, current_user.full_name)


@router.put("/{proforma_id}", response_model=ProformaResponse)
def update_proforma(
    proforma_id: UUID,
    payload: ProformaUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ProformaResponse:
    proforma = db.get(Proforma, proforma_id)
    if not proforma or proforma.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proforma not found")
    if proforma.status in ("accepted", "cancelled"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit accepted or cancelled proforma")

    business = db.get(Business, current_user.business_id)
    data = payload.model_dump(exclude_unset=True)
    items_payload = data.pop("items", None)

    for key, value in data.items():
        setattr(proforma, key, value)

    # Refresh issuer snapshot from current business
    if business:
        for k, v in _issuer_snapshot(business).items():
            setattr(proforma, k, v)

    if items_payload is not None:
        if len(items_payload) < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one line item required")
        items = _resolve_items(db, current_user.business_id, [ProformaItemCreate(**i) for i in items_payload])
        tax_rate = float(proforma.tax_rate or 0)
        discount = float(proforma.discount_amount or 0)
        subtotal, tax_amount, total, rows = _compute_totals(items, tax_rate, discount)
        for old in list(proforma.items or []):
            db.delete(old)
        db.flush()
        for row in _build_item_rows(proforma.id, rows):
            db.add(row)
        proforma.subtotal = subtotal
        proforma.tax_amount = tax_amount
        proforma.total_amount = total
    elif "tax_rate" in data or "discount_amount" in data:
        # Recalculate from existing items
        existing = [
            ProformaItemCreate(
                product_id=i.product_id,
                description=i.description,
                sku=i.sku,
                unit=i.unit or "piece",
                quantity=float(i.quantity),
                unit_price=float(i.unit_price),
                discount_amount=float(i.discount_amount or 0),
                price_source=i.price_source or "catalog",
            )
            for i in (proforma.items or [])
        ]
        subtotal, tax_amount, total, _ = _compute_totals(
            existing, float(proforma.tax_rate or 0), float(proforma.discount_amount or 0)
        )
        proforma.subtotal = subtotal
        proforma.tax_amount = tax_amount
        proforma.total_amount = total

    proforma.revision = int(proforma.revision or 1) + 1
    db.commit()
    db.refresh(proforma)
    created_by_name = current_user.full_name
    if proforma.created_by:
        user = db.get(User, proforma.created_by)
        created_by_name = user.full_name if user else created_by_name
    return _to_response(proforma, created_by_name)


@router.patch("/{proforma_id}/status", response_model=ProformaResponse)
def update_proforma_status(
    proforma_id: UUID,
    payload: ProformaStatusUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> ProformaResponse:
    proforma = db.get(Proforma, proforma_id)
    if not proforma or proforma.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proforma not found")
    proforma.status = payload.status
    db.commit()
    db.refresh(proforma)
    created_by_name = None
    if proforma.created_by:
        user = db.get(User, proforma.created_by)
        created_by_name = user.full_name if user else None
    return _to_response(proforma, created_by_name)


@router.delete("/{proforma_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_proforma(
    proforma_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> Response:
    proforma = db.get(Proforma, proforma_id)
    if not proforma or proforma.business_id != current_user.business_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proforma not found")
    if proforma.status not in ("draft", "cancelled"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft or cancelled proformas can be deleted")
    db.delete(proforma)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
