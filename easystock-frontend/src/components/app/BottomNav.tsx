import { CreditCard, Home, Package, Shield, ShoppingBag, User as UserIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const companyItems: NavItem[] = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/warehouse", label: "Warehouse", Icon: Package },
  { to: "/shop", label: "Shop", Icon: ShoppingBag },
  { to: "/credit", label: "Credit", Icon: CreditCard },
  { to: "/profile", label: "Profile", Icon: UserIcon },
];

const adminItems: NavItem[] = [
  { to: "/admin", label: "Admin", Icon: Shield },
  { to: "/profile", label: "Profile", Icon: UserIcon },
];

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;
  const items = isSystemAdmin ? adminItems : companyItems;
  const isTabRoute = items.some((item) => item.to === pathname || (item.to === "/" && pathname === "/dashboard"));

  if (!isTabRoute) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-white/10 bg-nav-slate shadow-lg sm:hidden">
      <div className="mx-auto flex max-w-5xl items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/admin"}
            className={({ isActive }) =>
              cn(
                "flex w-full flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium",
                isActive ? "text-nav-active" : "text-white/80",
              )
            }
          >
            <item.Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
