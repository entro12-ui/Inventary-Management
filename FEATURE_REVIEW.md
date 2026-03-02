# EasyStock Feature Review

This document maps your desired features to what is currently implemented in the system.

---

## 1. Control Inventory

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1.1 | **List: Item name, Part No, unit price, QTY** | ✅ **Done** | **WarehousePage** and **ProductsPage** show name, SKU/Part No (P.N), selling price, quantity. Warehouse list also shows barcode when set. |
| 1.2 | **View up-to-date item data** | ✅ **Done** | Product list is loaded from API; "Show product detail" / "Edit item" from warehouse open **ProductsPage** with product. Quantity updates (Stock In/Out) refresh local state. |
| 1.3 | **Transfer items from branch to branch** | ❌ **Missing** | UI has a disabled "Transfer to Branch" button on **WarehousePage**. Backend has **Store** and `store_id` on Product/Sale, but no transfer API or flow. |
| 1.4 | **Stock In & Stock Out** | ✅ **Done** | **WarehousePage** bottom sheet: "Stock in" / "Stock out" with adjustable qty; PATCH `/api/products/{id}` updates quantity. |

---

## 2. Record Sale

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 2.1 | **Search and sell by item name or Part No/code** | ⚠️ **Partial** | **SalesPage** loads all products and "Add product" adds the next unselected product—no search/filter by name or part no. **WarehousePage** search filters by name, SKU, barcode. Sales flow needs a search or product picker by name/part no. |
| 2.2 | **Recording sale by cash, credit or check** | ⚠️ **Partial** | Cash, credit, mobile money, bank transfer, card are in UI and backend. **Check** is not a separate option (could use "Bank transfer" or add a "check" payment method). |
| 2.3 | **View detailed sales history (items sold, customer, branch, seller, date)** | ⚠️ **Partial** | **ShopYearPage** = sales report by month + top items. **CreditPage** = credit sales with customer, amount, date. No single "sales history" screen with full detail per sale (items list, customer, branch, seller, date). Backend `list_sales` returns id, invoice_number, total_amount, items (product_id, qty, unit_price)—no customer_name, sale_date, created_by, store_id in response. Sale model has customer_name, sale_date, created_by, store_id but they are not exposed in SaleResponse. |

---

## 3. View Report

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 3.1 | **Total sales and expense report (PDF or Excel)** | ❌ **Missing** | **ReportPage** shows total sales and qty sold only. No expense tracking, no PDF/Excel export. |
| 3.2 | **Profit & Loss report** | ❌ **Missing** | No P&L report. Backend has cost_price and selling_price (profit possible per item) but no P&L API or UI. |
| 3.3 | **Filter sales list by seller, branch or customer** | ❌ **Missing** | Sales list is not shown in Report; Credit list has no filters. Backend sales list has no filter params (seller/branch/customer). |
| 3.4 | **View top products** | ✅ **Done** | **ShopYearPage** shows "top items" (by quantity/amount) from `/api/sales/summary/year`. |
| 3.5 | **View net worth for warehouse and shop** | ❌ **Missing** | No inventory value (qty × cost) or "net worth" report. |
| 3.6 | **View total revenue per branch** | ❌ **Missing** | Sales have `store_id` (branch) in DB but no report/API for revenue by branch. |

---

## 4. More

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 4.1 | **FIFO / LIFO / Average** | ❌ **Missing** | No costing method. Product has single cost_price; no batch/lot or FIFO/LIFO/Avg logic. |
| 4.2 | **Notify items to be expired** | ⚠️ **Partial** | **Product** has `expiry_date`; **DashboardPage** shows "To be expired" but value is hardcoded to 0. Backend has no "expiring soon" API; dashboard does not use expiry_date. |
| 4.3 | **Low stock notification and more** | ✅ **Done** | **DashboardPage** shows low stock count from `/api/dashboard/summary` (products where quantity ≤ low_stock_threshold). **WarehousePage** shows "Available" / "Out". |

---

## Summary

| Category           | Done | Partial | Missing |
|--------------------|------|--------|--------|
| Control Inventory  | 3    | 0      | 1       |
| Record Sale        | 0    | 3      | 0       |
| View Report        | 1    | 0      | 5       |
| More               | 1    | 1      | 1       |

**Suggested priorities**

1. **Branch transfer** – Implement transfer API and "Transfer to Branch" flow (select source/target branch, product, qty).
2. **Sales: search by name/part no** – On SalesPage, add search/filter so users can find and add products by name or part no/code.
3. **Sales history detail** – Extend SaleResponse and add a screen to show per-sale: items (with names), customer, branch, seller, date; optionally add filters (seller, branch, customer).
4. **Check payment** – Add "check" to PaymentMethod if needed, or document that "Bank transfer" covers check.
5. **Reports** – Export (PDF/Excel), P&L, filters by seller/branch/customer, net worth, revenue per branch.
6. **Expiry** – Backend API for "expiring soon"; dashboard "To be expired" from real data.
7. **FIFO/LIFO/Average** – Larger change (batch/lot tracking + costing); plan as a separate phase.

---

*Generated from current codebase review.*
