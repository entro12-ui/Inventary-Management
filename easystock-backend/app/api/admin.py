"""System admin API - platform-wide management."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, get_system_admin
from app.core.security import generate_otp
from app.models.business import Business
from app.models.user import User
from app.models.full_schema import UserRole

router = APIRouter()


@router.get("/companies")
def list_companies(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_system_admin),
) -> list[dict]:
    companies = (
        db.query(Business)
        .order_by(Business.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(b.id),
            "name": b.name,
            "email": b.email,
            "is_active": b.is_active,
            "approval_status": getattr(b, "approval_status", "approved"),
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in companies
    ]


@router.post("/companies/{company_id}/approve")
def approve_company(
    company_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_system_admin),
) -> dict:
    """Approve a pending company. Generates OTP for admin. Share OTP with company admin to activate account."""
    business = db.get(Business, company_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if getattr(business, "approval_status", "approved") == "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company already approved")

    owner = db.query(User).filter(User.business_id == company_id, User.role == UserRole.OWNER).first()
    if not owner:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No owner found for this company")

    otp = generate_otp(6)
    owner.verification_token = otp
    owner.reset_password_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    business.approval_status = "approved"
    db.commit()

    return {
        "message": "Company approved. Share this OTP with the company admin (one-time use, expires in 24h).",
        "otp": otp,
        "admin_email": owner.email,
    }


@router.get("/companies/{company_id}")
def get_company(
    company_id: UUID,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_system_admin),
) -> dict:
    business = db.get(Business, company_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    user_count = db.query(User).filter(User.business_id == company_id).count()
    return {
        "id": str(business.id),
        "name": business.name,
        "email": business.email,
        "phone": business.phone,
        "address": business.address,
        "city": business.city,
        "country": business.country,
        "currency": business.currency,
        "is_active": business.is_active,
        "approval_status": getattr(business, "approval_status", "approved"),
        "user_count": user_count,
        "created_at": business.created_at.isoformat() if business.created_at else None,
    }


@router.get("/users")
def list_all_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    company_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_system_admin),
) -> list[dict]:
    q = db.query(User).filter(User.business_id.isnot(None))
    if company_id:
        q = q.filter(User.business_id == company_id)
    users = q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value if u.role else None,
            "business_id": str(u.business_id) if u.business_id else None,
            "is_active": u.is_active,
        }
        for u in users
    ]
