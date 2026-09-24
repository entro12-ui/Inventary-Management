export type ExpiryStatus = "none" | "ok" | "soon" | "expired";

const SOON_DAYS = 30;

export function parseExpiryDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getExpiryStatus(
  expiry: string | Date | null | undefined,
  now: Date = new Date(),
): ExpiryStatus {
  const d = parseExpiryDate(expiry);
  if (!d) return "none";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (expiryDay < startOfToday) return "expired";
  const soon = new Date(startOfToday);
  soon.setDate(soon.getDate() + SOON_DAYS);
  if (expiryDay <= soon) return "soon";
  return "ok";
}

export function formatExpiryLabel(expiry: string | Date | null | undefined): string | null {
  const d = parseExpiryDate(expiry);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function toDateInputValue(expiry: string | Date | null | undefined): string {
  const d = parseExpiryDate(expiry);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
