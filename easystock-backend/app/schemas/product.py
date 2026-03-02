from uuid import UUID

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=100)
    barcode: str | None = Field(default=None, max_length=100)
    part_no: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)
    min_stock: int = Field(default=10, ge=0)
    cost_price: float = Field(..., gt=0)
    selling_price: float = Field(..., gt=0)
    quantity: int = Field(0, ge=0)
    store_id: UUID | None = Field(default=None, description="Branch/warehouse to add inventory to")

class ProductResponse(ProductCreate):
    id: UUID
    business_id: UUID

    model_config = {"from_attributes": True}


class ProductUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    barcode: str | None = None
    part_no: str | None = None
    location: str | None = None
    image_url: str | None = None
    min_stock: int | None = Field(default=None, ge=0)
    cost_price: float | None = None
    selling_price: float | None = None
    quantity: int | None = None
