export type BusinessType = "general" | "pharmacy" | "bakery" | "building" | "retail";

export const BUSINESS_TYPE_OPTIONS: {
  value: BusinessType;
  label: string;
  hint: string;
}[] = [
  { value: "general", label: "General shop / warehouse", hint: "Any inventory and sales business" },
  { value: "retail", label: "Retail / mini mart", hint: "Grocery, kiosk, supermarket-style" },
  { value: "pharmacy", label: "Pharmacy", hint: "Medicines with batch and expiry" },
  { value: "bakery", label: "Bakery", hint: "Bread, cakes — short shelf life" },
  { value: "building", label: "Building materials", hint: "Cement, steel, timber, hardware" },
];

export function businessTypeLabel(type?: string | null): string {
  return BUSINESS_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "General shop / warehouse";
}

/** Whether expiry/batch fields are especially relevant for this business type. */
export function showsExpiryFields(type?: string | null): boolean {
  return type === "pharmacy" || type === "bakery";
}
