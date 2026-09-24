from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.business import router as business_router
from app.api.dashboard import router as dashboard_router
from app.api.products import router as products_router
from app.api.proformas import router as proformas_router
from app.api.reports import router as reports_router
from app.api.sales import router as sales_router
from app.api.stock import router as stock_router
from app.api.transfers import router as transfers_router
from app.api.uploads import router as uploads_router

api_router = APIRouter()
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(products_router, prefix="/products", tags=["products"])
api_router.include_router(stock_router, prefix="/stock", tags=["stock"])
api_router.include_router(transfers_router, prefix="/transfers", tags=["transfers"])
api_router.include_router(sales_router, prefix="/sales", tags=["sales"])
api_router.include_router(proformas_router, prefix="/proformas", tags=["proformas"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(business_router, prefix="/business", tags=["business"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
api_router.include_router(uploads_router, prefix="/uploads", tags=["uploads"])
