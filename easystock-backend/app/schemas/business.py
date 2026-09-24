from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

BUSINESS_TYPES = ("general", "pharmacy", "bakery", "building", "retail")
BUSINESS_TYPE_PATTERN = "^(general|pharmacy|bakery|building|retail)$"


class BusinessMeResponse(BaseModel):
    id: UUID
    name: str
    city: str | None = None
    country: str | None = None
    logo_url: str | None = None
    default_min_stock: int = 10
    business_type: str = "general"

    model_config = {"from_attributes": True}


class BusinessSettingsUpdate(BaseModel):
    default_min_stock: int | None = Field(default=None, ge=0, le=100000)
    business_type: str | None = Field(default=None, pattern=BUSINESS_TYPE_PATTERN)


class BusinessUserItem(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str


class InviteUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=6)
    role: str = Field(default="staff", pattern="^(owner|manager|staff)$")
