export type UserRole = "system_admin" | "owner" | "manager" | "staff";

export type User = {
  id: string;
  business_id: string | null;
  email: string;
  full_name: string;
  role: UserRole;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};
