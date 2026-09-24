from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

SALE_UNIT_PATTERN = "^(piece|pack|box|bottle|strip|kg|g|liter|meter|sheet|bag|loaf|other)$"


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=100)
    barcode: str | None = Field(default=None, max_length=100)
    part_no: str | None = Field(default=None, max_length=100)
    batch_no: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)
    min_stock: int | None = Field(default=None, ge=0)
    sale_unit: str = Field(default="piece", pattern=SALE_UNIT_PATTERN)
    sale_unit_custom: str | None = Field(default=None, max_length=50)
    cost_price: float = Field(..., gt=0)
    selling_price: float = Field(..., gt=0)
    quantity: int = Field(0, ge=0)
    store_id: UUID | None = Field(default=None, description="Branch/warehouse to add inventory to")
    expiry_date: datetime | None = Field(default=None)

    @field_validator("sale_unit_custom")
    @classmethod
    def strip_custom(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned or None

    @model_validator(mode="after")
    def require_custom_when_other(self) -> "ProductCreate":
        if self.sale_unit == "other" and not self.sale_unit_custom:
            raise ValueError("Choose a custom unit when Sold as is Other")
        if self.sale_unit != "other":
            self.sale_unit_custom = None
        return self


class ProductResponse(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    sku: str
    barcode: str | None = None
    part_no: str | None = None
    batch_no: str | None = None
    location: str | None = None
    image_url: str | None = None
    min_stock: int = 10
    sale_unit: str = "piece"
    sale_unit_custom: str | None = None
    cost_price: float
    selling_price: float
    quantity: int = 0
    store_id: UUID | None = None
    expiry_date: datetime | None = None

    model_config = {"from_attributes": True}


class ProductUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    barcode: str | None = None
    part_no: str | None = None
    batch_no: str | None = None
    location: str | None = None
    image_url: str | None = None
    min_stock: int | None = Field(default=None, ge=0)
    sale_unit: str | None = Field(default=None, pattern=SALE_UNIT_PATTERN)
    sale_unit_custom: str | None = Field(default=None, max_length=50)
    cost_price: float | None = None
    selling_price: float | None = None
    quantity: int | None = None
    expiry_date: datetime | None = None

    @field_validator("sale_unit_custom")
    @classmethod
    def strip_custom(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned or None
