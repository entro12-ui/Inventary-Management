from uuid import UUID

from app.models.user import UserRole
from pydantic import BaseModel, EmailStr, Field


class BranchCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: str | None = None


class CompanyRegister(BaseModel):
    """Company registration - no password. Pending admin approval."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    business_name: str = Field(..., min_length=1, max_length=200)
    phone: str | None = None
    branches: list[BranchCreate] = Field(default_factory=list, max_length=10)


class UserCreate(BaseModel):
    """Legacy - kept for compatibility."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=6)
    business_name: str | None = Field(None, min_length=1, max_length=200)
    branches: list[BranchCreate] = Field(default_factory=list, max_length=10)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ActivateAccount(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=1, max_length=10)
    new_password: str = Field(..., min_length=6)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    email: EmailStr
    token: str = Field(..., min_length=1, max_length=20)
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: UUID
    business_id: UUID | None = None
    email: EmailStr
    full_name: str
    role: UserRole

    model_config = {"from_attributes": True, "use_enum_values": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
