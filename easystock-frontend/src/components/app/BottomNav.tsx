import { CreditCard, Home, Package, Shield, ShoppingBag, User as UserIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const companyItems: NavItem[] = [
  { to: "/", label: "Home", Icon: Home, match: (p) => p === "/" || p === "/dashboard" },
  {
    to: "/warehouse",
    label: "Stock",
    Icon: Package,
    match: (p) => p.startsWith("/warehouse") || p.startsWith("/products"),
  },
  {
    to: "/shop",
    label: "Shop",
    Icon: ShoppingBag,
    match: (p) => p === "/shop" || p.startsWith("/sales") || p === "/sales-history",
  },
  { to: "/credit", label: "Credit", Icon: CreditCard },
  {
    to: "/profile",
    label: "More",
    Icon: UserIcon,
    match: (p) =>
      p === "/profile" ||
      p.startsWith("/report") ||
      p.startsWith("/proformas") ||
      p === "/branches" ||
      p === "/company-users",
  },
];

const adminItems: NavItem[] = [
  { to: "/admin", label: "Admin", Icon: Shield },
  { to: "/profile", label: "Profile", Icon: UserIcon },
];

const VISIBLE_PREFIXES = [
  "/",
  "/dashboard",
  "/warehouse",
  "/products",
  "/shop",
  "/sales",
  "/sales-history",
  "/credit",
  "/proformas",
  "/profile",
  "/report",
  "/branches",
  "/company-users",
  "/admin",
];

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;
  const items = isSystemAdmin ? adminItems : companyItems;

  const isVisible = VISIBLE_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p)),
  );
  if (!isVisible) return null;
  if (pathname === "/warehouse/add") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-white/10 bg-nav-slate shadow-lg sm:hidden">
      <div className="mx-auto flex max-w-5xl items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map((item) => {
          const active = item.match
            ? item.match(pathname)
            : pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/" || item.to === "/admin"}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                active ? "text-nav-active" : "text-white/75",
              )}
            >
              <item.Icon className={cn("h-5 w-5", active && "animate-soft-pulse")} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
