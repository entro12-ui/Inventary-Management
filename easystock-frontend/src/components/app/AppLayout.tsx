import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { BottomNav } from "@/components/app/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMPANY_ONLY_PATHS = ["/dashboard", "/products", "/sales", "/warehouse", "/warehouse/add", "/shop", "/credit", "/report", "/branches", "/company-users"];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;

  // System admin must only see companies — redirect from company-only routes
  React.useEffect(() => {
    if (isSystemAdmin && COMPANY_ONLY_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"))) {
      navigate("/admin", { replace: true });
    }
  }, [isSystemAdmin, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="hidden border-b shadow-sm sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3 lg:max-w-7xl lg:px-8">
          <Link to="/" className="text-base font-semibold lg:text-lg">
            EasyStock
          </Link>

          <nav className="flex items-center gap-1 lg:gap-2">
            {isSystemAdmin ? (
              <>
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm hover:bg-accent",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Companies
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm hover:bg-accent",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Profile
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent lg:px-4",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent lg:px-4",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Products
                </NavLink>
                <NavLink
                  to="/warehouse"
                  className={({ isActive }) =>
                    cn(
                      "hidden rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent lg:block lg:px-4",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Warehouse
                </NavLink>
                <NavLink
                  to="/sales"
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent lg:px-4",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Sales
                </NavLink>
                <NavLink
                  to="/report"
                  className={({ isActive }) =>
                    cn(
                      "hidden rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent lg:block lg:px-4",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Report
                </NavLink>
                <NavLink
                  to="/credit"
                  className={({ isActive }) =>
                    cn(
                      "hidden rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-accent lg:block lg:px-4",
                      isActive && "bg-accent",
                    )
                  }
                >
                  Credit
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs text-muted-foreground sm:block lg:text-sm">
              <div className="font-medium text-foreground">{user?.full_name ?? ""}</div>
              <div className="truncate max-w-[180px] lg:max-w-[220px]">{user?.email ?? ""}</div>
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
