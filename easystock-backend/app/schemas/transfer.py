from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TransferCreate(BaseModel):
    from_store_id: UUID
    to_store_id: UUID
    product_id: UUID
    quantity: int = Field(..., gt=0)


class TransferResponse(BaseModel):
    id: UUID
    from_store_id: UUID
    to_store_id: UUID
    product_id: UUID
    quantity: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
