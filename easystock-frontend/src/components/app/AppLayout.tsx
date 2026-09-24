import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { BottomNav } from "@/components/app/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMPANY_ONLY_PATHS = [
  "/dashboard",
  "/products",
  "/sales",
  "/warehouse",
  "/warehouse/add",
  "/shop",
  "/credit",
  "/report",
  "/branches",
  "/company-users",
];

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground lg:px-4",
    isActive && "bg-primary/10 text-primary",
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;

  React.useEffect(() => {
    if (isSystemAdmin && COMPANY_ONLY_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"))) {
      navigate("/admin", { replace: true });
    }
  }, [isSystemAdmin, location.pathname, navigate]);

  return (
    <div className="page-surface min-h-screen">
      <header className="sticky top-0 z-40 hidden border-b border-border/80 bg-card/90 shadow-sm backdrop-blur-md sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3 lg:max-w-7xl lg:px-8">
          <Link to="/" className="font-display text-lg font-bold tracking-tight lg:text-xl">
            Easy<span className="text-primary">Stock</span>
          </Link>

          <nav className="flex items-center gap-1 lg:gap-2">
            {isSystemAdmin ? (
              <>
                <NavLink to="/admin" end className={navClass}>
                  Companies
                </NavLink>
                <NavLink to="/profile" className={navClass}>
                  Profile
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={navClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/products" className={navClass}>
                  Products
                </NavLink>
                <NavLink to="/warehouse" className={navClass}>
                  Warehouse
                </NavLink>
                <NavLink to="/sales" className={navClass}>
                  Sales
                </NavLink>
                <NavLink to="/shop" className={navClass}>
                  Shop
                </NavLink>
                <NavLink to="/proformas" className={navClass}>
                  Proforma
                </NavLink>
                <NavLink to="/report" className={navClass}>
                  Report
                </NavLink>
                <NavLink to="/credit" className={navClass}>
                  Credit
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs text-muted-foreground sm:block lg:text-sm">
              <div className="font-medium text-foreground">{user?.full_name ?? ""}</div>
              <div className="max-w-[180px] truncate lg:max-w-[220px]">{user?.email ?? ""}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-4 pb-24 sm:py-6 sm:pb-6 lg:max-w-7xl lg:px-8 lg:py-8">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
