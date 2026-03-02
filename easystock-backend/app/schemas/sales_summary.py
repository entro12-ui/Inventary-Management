from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class YearlySalesMonth(BaseModel):
    month: int = Field(..., ge=1, le=12)
    label: str
    total_amount: float = Field(..., ge=0)


class YearlyTopItem(BaseModel):
    product_id: UUID
    name: str
    sku: str | None = None
    barcode: str | None = None
    image_url: str | None = None
    qty: int = Field(..., ge=0)
    amount: float = Field(..., ge=0)


class YearlySalesSummaryResponse(BaseModel):
    year: int
    months: list[YearlySalesMonth]
    top_items: list[YearlyTopItem]
    currency: str
