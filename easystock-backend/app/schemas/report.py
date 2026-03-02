from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReportSummaryResponse(BaseModel):
    business_name: str
    total_sales: float = Field(..., ge=0)
    total_qty_sold: int = Field(..., ge=0)
    currency: str


class ProfitLossResponse(BaseModel):
    revenue: float = Field(..., ge=0)
    cogs: float = Field(..., ge=0)
    gross_profit: float = Field(..., ge=0)
    currency: str


class NetWorthResponse(BaseModel):
    inventory_value: float = Field(..., ge=0)
    total_qty: float = Field(default=0, ge=0)
    currency: str


class RevenueByBranchItem(BaseModel):
    store_id: UUID | None
    store_name: str
    total_sales: float = Field(..., ge=0)
    total_qty_sold: float = Field(default=0, ge=0)


class RevenueByBranchResponse(BaseModel):
    items: list[RevenueByBranchItem]
    currency: str


class SalesListFilteredItem(BaseModel):
    id: UUID
    invoice_number: str
    sale_date: datetime | None
    customer_name: str | None
    store_name: str | None
    created_by_name: str | None
    total_amount: float
    items_count: int


class BranchInventoryItem(BaseModel):
    store_id: UUID
    store_name: str
    quantity: float
    total_amount: float


class BranchInventoryResponse(BaseModel):
    items: list[BranchInventoryItem]
    currency: str


class BusinessReportSaleItem(BaseModel):
    product_name: str
    customer_name: str | None
    quantity: float
    unit_price: float
    total: float
    sold_by: str | None
    branch_name: str | None


class BusinessReportResponse(BaseModel):
    sales_items: list[BusinessReportSaleItem]
    purchase_total: float
    sell_total: float
    profit: float
    due: float
    expense_total: float
    loss: float
    currency: str
