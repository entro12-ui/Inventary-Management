from collections.abc import Generator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.full_schema import UserRole
from app.models.user import User


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
        parsed_user_id = UUID(user_id)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.get(User, parsed_user_id)
    if not user:
        raise credentials_exception
    return user


def get_company_user(current_user: User = Depends(get_current_user)) -> User:
    """Requires user to belong to a company (not system admin)."""
    if current_user.business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company access required. Use system admin endpoints.",
        )
    return current_user


def get_system_admin(current_user: User = Depends(get_current_user)) -> User:
    """Requires system admin role."""
    if current_user.role != UserRole.SYSTEM_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System admin access required",
        )
    return current_user


def get_company_admin(current_user: User = Depends(get_company_user)) -> User:
    """Requires user to be company owner or manager (for user management)."""
    if current_user.role not in (UserRole.OWNER, UserRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company admin access required",
        )
    return current_user
