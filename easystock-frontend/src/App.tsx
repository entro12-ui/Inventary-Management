import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "@/auth/RequireAuth";
import { AppLayout } from "@/components/app/AppLayout";
import { ActivatePage } from "@/pages/ActivatePage";
import { AddWarehouseItemPage } from "@/pages/AddWarehouseItemPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import { BranchesPage } from "@/pages/BranchesPage";
import { CompanyUsersPage } from "@/pages/CompanyUsersPage";
import { CreditPage } from "@/pages/CreditPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { HomePage } from "@/pages/HomePage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProductsPage } from "@/pages/ProductsPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ReportPage } from "@/pages/ReportPage";
import { ReportBusinessPage } from "@/pages/ReportBusinessPage";
import { ReportProductPage } from "@/pages/ReportProductPage";
import { ReportShopPage } from "@/pages/ReportShopPage";
import { ReportTopProductsPage } from "@/pages/ReportTopProductsPage";
import { ReportWarehousePage } from "@/pages/ReportWarehousePage";
import { SalesPage } from "@/pages/SalesPage";
import { SalesHistoryPage } from "@/pages/SalesHistoryPage";
import { ShopYearPage } from "@/pages/ShopYearPage";
import { WarehousePage } from "@/pages/WarehousePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/warehouse" element={<WarehousePage />} />
          <Route path="/warehouse/add" element={<AddWarehouseItemPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/shop" element={<SalesHistoryPage />} />
          <Route path="/sales-history" element={<ShopYearPage />} />
          <Route path="/credit" element={<CreditPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/report/warehouse" element={<ReportWarehousePage />} />
          <Route path="/report/shop" element={<ReportShopPage />} />
          <Route path="/report/business" element={<ReportBusinessPage />} />
          <Route path="/report/product" element={<ReportProductPage />} />
          <Route path="/report/top-products" element={<ReportTopProductsPage />} />
          <Route path="/report/yearly" element={<ShopYearPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/company-users" element={<CompanyUsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
