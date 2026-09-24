from datetime import datetime
from uuid import UUID

from app.models.sale import PaymentMethod
from pydantic import BaseModel, Field


class SaleItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)


class SaleCreate(BaseModel):
    items: list[SaleItemCreate] = Field(..., min_length=1)
    payment_method: PaymentMethod
    store_id: UUID | None = Field(default=None, description="Branch/shop where sale is made")
    customer_name: str | None = Field(default=None, max_length=200)
    customer_phone: str | None = Field(default=None, max_length=50)
    notes: str | None = None
    paid_amount: float | None = Field(default=None, ge=0)
    payment_proof_url: str | None = Field(default=None, max_length=500)


class SaleItemResponse(BaseModel):
    product_id: UUID
    quantity: int
    unit_price: float


class SaleResponse(BaseModel):
    id: UUID
    invoice_number: str
    total_amount: float
    items: list[SaleItemResponse] = []
    customer_name: str | None = None
    sale_date: datetime
    payment_status: str
    payment_method: PaymentMethod
    payment_proof_url: str | None = None

    model_config = {"from_attributes": True}


class SaleDetailItemResponse(BaseModel):
    product_id: UUID
    product_name: str
    image_url: str | None = None
    sku: str | None = None
    part_no: str | None = None
    quantity: float
    unit_price: float
    total: float
    store_name: str | None = None


class SaleDetailResponse(BaseModel):
    id: UUID
    invoice_number: str
    total_amount: float
    paid_amount: float = 0.0
    remaining_amount: float = 0.0
    notes: str | None = None
    payment_proof_url: str | None = None
    items: list[SaleDetailItemResponse] = []
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_email: str | None = None
    sale_date: datetime
    payment_status: str
    payment_method: PaymentMethod
    sold_by_name: str | None = None
    store_name: str | None = None
