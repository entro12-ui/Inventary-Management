from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class StoreCreate(BaseModel):
    name: str
    location: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None


class StoreResponse(BaseModel):
    id: UUID
    name: str
    location: str | None = None

    model_config = {"from_attributes": True}
