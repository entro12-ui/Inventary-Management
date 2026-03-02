from __future__ import annotations

from pydantic import BaseModel, Field


class SalePaymentAdd(BaseModel):
    amount: float = Field(..., gt=0)
