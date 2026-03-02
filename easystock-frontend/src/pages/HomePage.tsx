import { Navigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";

/** Redirects system admin to /admin, company users to dashboard. */
export function HomePage() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === "system_admin" || !user?.business_id;
  return <Navigate to={isSystemAdmin ? "/admin" : "/dashboard"} replace />;
}
