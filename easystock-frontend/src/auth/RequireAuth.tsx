import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";

export function RequireAuth() {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}
