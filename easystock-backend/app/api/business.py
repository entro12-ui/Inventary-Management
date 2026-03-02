from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_company_admin, get_company_user, get_db_session
from app.models.business import Business, Store
from app.models.user import User
from app.core.security import get_password_hash
from app.models.full_schema import UserRole
from app.schemas.business import BusinessMeResponse, BusinessUserItem, InviteUserCreate
from app.schemas.store import StoreCreate, StoreResponse

router = APIRouter()


@router.get("/me", response_model=BusinessMeResponse)
def get_my_business(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> BusinessMeResponse:
    business = db.get(Business, current_user.business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return BusinessMeResponse.model_validate(business)


@router.get("/stores", response_model=list[StoreResponse])
def list_stores(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> list[StoreResponse]:
    stores = (
        db.query(Store)
        .filter(Store.business_id == current_user.business_id, Store.is_active == True)
        .order_by(Store.name.asc())
        .all()
    )
    return [StoreResponse.model_validate(s) for s in stores]


@router.post("/stores", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(
    payload: StoreCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> StoreResponse:
    business = db.get(Business, current_user.business_id)
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    store_count = db.query(Store).filter(Store.business_id == current_user.business_id, Store.is_active == True).count()
    limit = max(business.max_stores or 5, 5)
    if store_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum stores limit ({limit}) reached",
        )
    store = Store(
        business_id=current_user.business_id,
        name=payload.name,
        location=payload.location,
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
    )
    db.add(store)
    db.commit()
    db.refresh(store)
    return StoreResponse.model_validate(store)


@router.get("/users", response_model=list[BusinessUserItem])
def list_business_users(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_user),
) -> list[BusinessUserItem]:
    users = (
        db.query(User)
        .filter(User.business_id == current_user.business_id)
        .order_by(User.full_name.asc())
        .all()
    )
    return [
        BusinessUserItem(id=u.id, full_name=u.full_name, email=u.email, role=u.role.value if u.role else "staff")
        for u in users
    ]


@router.post("/users", status_code=status.HTTP_201_CREATED)
def invite_user(
    payload: InviteUserCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_company_admin),
) -> dict:
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    role_map = {"owner": UserRole.OWNER, "manager": UserRole.MANAGER, "staff": UserRole.STAFF}
    role = role_map.get(payload.role.lower(), UserRole.STAFF)
    if role == UserRole.OWNER and current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can create other owners")
    user = User(
        business_id=current_user.business_id,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=get_password_hash(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": str(user.id), "email": user.email, "full_name": user.full_name, "role": role.value}
