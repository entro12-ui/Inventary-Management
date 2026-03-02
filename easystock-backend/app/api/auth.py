from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db_session
from app.core.security import create_access_token, generate_otp, get_password_hash, verify_password
from app.models.business import Business, Store
from app.models.user import User
from app.models.full_schema import UserRole
from app.schemas.user import (
    ActivateAccount,
    ChangePassword,
    CompanyRegister,
    ForgotPassword,
    ResetPassword,
    TokenResponse,
    UserLogin,
    UserResponse,
)

router = APIRouter()

_PLACEHOLDER_HASH = get_password_hash("__pending_activation__")


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: CompanyRegister, db: Session = Depends(get_db_session)) -> dict:
    """Register a company. Pending admin approval. No password yet."""
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    business = Business(
        name=payload.business_name.strip(),
        email=payload.email,
        phone=payload.phone,
        max_stores=10,
        approval_status="pending",
    )
    db.add(business)
    db.flush()

    if payload.branches and len(payload.branches) > 0:
        for b in payload.branches:
            store = Store(business_id=business.id, name=b.name.strip(), location=b.location)
            db.add(store)
    else:
        default_store = Store(business_id=business.id, name="Main Warehouse")
        db.add(default_store)

    user = User(
        business_id=business.id,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=_PLACEHOLDER_HASH,
        role=UserRole.OWNER,
        is_active=False,
    )
    db.add(user)
    db.commit()

    return {
        "message": "Company registered. Pending admin approval. You will receive a one-time password (OTP) by email after approval to set your password and activate your account.",
    }


@router.post("/activate-account", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def activate_account(payload: ActivateAccount, db: Session = Depends(get_db_session)) -> TokenResponse:
    """Activate account with OTP and set password. Returns token for immediate login."""
    from datetime import datetime, timezone

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or OTP")

    if user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account already activated. Use login.")

    if not user.verification_token or user.verification_token != payload.otp.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    if user.reset_password_expires and user.reset_password_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="OTP has expired. Contact admin for a new one.")

    user.password_hash = get_password_hash(payload.new_password)
    user.verification_token = None
    user.reset_password_expires = None
    user.is_active = True
    user.email_verified = True
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db_session)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not activated. Use the OTP sent to your email to set your password first.",
        )

    if user.business_id:
        business = db.get(Business, user.business_id)
        if business and getattr(business, "approval_status", "approved") != "approved":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company is pending approval. Contact system admin.",
            )

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    payload: ForgotPassword,
    db: Session = Depends(get_db_session),
) -> dict:
    """Request password reset. Generates a one-time code (valid 1 hour)."""
    from datetime import datetime, timedelta, timezone

    user = db.query(User).filter(User.email == payload.email, User.is_active.is_(True)).first()
    if not user:
        return {"message": "If an account exists with this email, you will receive a reset code."}

    token = generate_otp(6)
    user.reset_password_token = token
    user.reset_password_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()

    return {
        "message": "If an account exists with this email, you will receive a reset code.",
        "reset_token": token,
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    payload: ResetPassword,
    db: Session = Depends(get_db_session),
) -> dict:
    """Reset password using the token from forgot-password."""
    from datetime import datetime, timezone

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.reset_password_token or user.reset_password_token != payload.token.strip():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired reset code")

    if user.reset_password_expires and user.reset_password_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Reset code has expired. Request a new one.")

    user.password_hash = get_password_hash(payload.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()
    return {"message": "Password updated. You can now sign in."}


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePassword,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Change password for logged-in user."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
