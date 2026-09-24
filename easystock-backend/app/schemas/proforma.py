from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

DOCUMENT_TYPE_PATTERN = "^(quotation|tender_bid)$"
STATUS_PATTERN = "^(draft|sent|accepted|rejected|expired|cancelled)$"
PRICE_SOURCE_PATTERN = "^(catalog|custom)$"


class ProformaItemCreate(BaseModel):
    product_id: UUID | None = None
    description: str = Field(..., min_length=1, max_length=500)
    sku: str | None = Field(default=None, max_length=100)
    unit: str = Field(default="piece", max_length=50)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    discount_amount: float = Field(default=0.0, ge=0)
    price_source: str = Field(default="catalog", pattern=PRICE_SOURCE_PATTERN)


class ProformaCreate(BaseModel):
    document_type: str = Field(default="quotation", pattern=DOCUMENT_TYPE_PATTERN)
    status: str = Field(default="draft", pattern=STATUS_PATTERN)
    issue_date: datetime | None = None
    valid_until: datetime | None = None

    issuer_tin: str | None = Field(default=None, max_length=100)

    client_company_name: str = Field(..., min_length=1, max_length=200)
    client_contact_name: str | None = Field(default=None, max_length=200)
    client_address: str | None = None
    client_phone: str | None = Field(default=None, max_length=50)
    client_email: str | None = Field(default=None, max_length=200)
    client_tin: str | None = Field(default=None, max_length=100)

    tender_title: str | None = Field(default=None, max_length=300)
    tender_reference: str | None = Field(default=None, max_length=150)
    tender_closing_date: datetime | None = None

    tax_rate: float = Field(default=0.0, ge=0, le=100)
    discount_amount: float = Field(default=0.0, ge=0)
    currency: str = Field(default="ETB", max_length=10)

    payment_terms: str | None = None
    delivery_terms: str | None = None
    notes: str | None = None
    terms_and_conditions: str | None = None

    authorized_name: str | None = Field(default=None, max_length=200)
    authorized_title: str | None = Field(default=None, max_length=200)
    stamp_url: str | None = Field(default=None, max_length=500)
    signature_url: str | None = Field(default=None, max_length=500)

    items: list[ProformaItemCreate] = Field(..., min_length=1)

    @model_validator(mode="after")
    def tender_fields(self) -> ProformaCreate:
        if self.document_type == "tender_bid" and not (self.tender_reference or self.tender_title):
            raise ValueError("Open tender requires tender title or tender reference")
        return self


class ProformaUpdate(BaseModel):
    document_type: str | None = Field(default=None, pattern=DOCUMENT_TYPE_PATTERN)
    status: str | None = Field(default=None, pattern=STATUS_PATTERN)
    issue_date: datetime | None = None
    valid_until: datetime | None = None
    issuer_tin: str | None = Field(default=None, max_length=100)
    client_company_name: str | None = Field(default=None, min_length=1, max_length=200)
    client_contact_name: str | None = Field(default=None, max_length=200)
    client_address: str | None = None
    client_phone: str | None = Field(default=None, max_length=50)
    client_email: str | None = Field(default=None, max_length=200)
    client_tin: str | None = Field(default=None, max_length=100)
    tender_title: str | None = Field(default=None, max_length=300)
    tender_reference: str | None = Field(default=None, max_length=150)
    tender_closing_date: datetime | None = None
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    discount_amount: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=10)
    payment_terms: str | None = None
    delivery_terms: str | None = None
    notes: str | None = None
    terms_and_conditions: str | None = None
    authorized_name: str | None = Field(default=None, max_length=200)
    authorized_title: str | None = Field(default=None, max_length=200)
    stamp_url: str | None = Field(default=None, max_length=500)
    signature_url: str | None = Field(default=None, max_length=500)
    items: list[ProformaItemCreate] | None = None


class ProformaStatusUpdate(BaseModel):
    status: str = Field(..., pattern=STATUS_PATTERN)


class ProformaItemResponse(BaseModel):
    id: UUID
    product_id: UUID | None = None
    line_no: int
    description: str
    sku: str | None = None
    unit: str
    quantity: float
    unit_price: float
    discount_amount: float
    line_total: float
    price_source: str

    model_config = {"from_attributes": True}


class ProformaListItem(BaseModel):
    id: UUID
    proforma_number: str
    document_type: str
    status: str
    issue_date: datetime | None = None
    valid_until: datetime | None = None
    client_company_name: str
    tender_reference: str | None = None
    tender_title: str | None = None
    total_amount: float
    currency: str
    items_count: int = 0
    revision: int = 1

    model_config = {"from_attributes": True}


class ProformaResponse(BaseModel):
    id: UUID
    proforma_number: str
    document_type: str
    status: str
    issue_date: datetime | None = None
    valid_until: datetime | None = None
    issuer_name: str
    issuer_address: str | None = None
    issuer_city: str | None = None
    issuer_country: str | None = None
    issuer_phone: str | None = None
    issuer_email: str | None = None
    issuer_logo_url: str | None = None
    issuer_tin: str | None = None
    client_company_name: str
    client_contact_name: str | None = None
    client_address: str | None = None
    client_phone: str | None = None
    client_email: str | None = None
    client_tin: str | None = None
    tender_title: str | None = None
    tender_reference: str | None = None
    tender_closing_date: datetime | None = None
    currency: str
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    payment_terms: str | None = None
    delivery_terms: str | None = None
    notes: str | None = None
    terms_and_conditions: str | None = None
    authorized_name: str | None = None
    authorized_title: str | None = None
    stamp_url: str | None = None
    signature_url: str | None = None
    revision: int
    created_by_name: str | None = None
    items: list[ProformaItemResponse] = []

    model_config = {"from_attributes": True}
