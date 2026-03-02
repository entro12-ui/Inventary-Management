from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class BusinessMeResponse(BaseModel):
    id: UUID
    name: str
    city: str | None = None
    country: str | None = None
    logo_url: str | None = None

    model_config = {"from_attributes": True}


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
