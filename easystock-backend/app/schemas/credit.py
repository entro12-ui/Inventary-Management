from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CreditSaleResponse(BaseModel):
    id: UUID
    customer_name: str | None = None
    items_count: int = Field(..., ge=0)
    sale_date: datetime
    total_amount: float = Field(..., ge=0)
    paid_amount: float = Field(0, ge=0)
    remaining_amount: float = Field(0, ge=0)
    payment_status: str

    model_config = {"from_attributes": True}
