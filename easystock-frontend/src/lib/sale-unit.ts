export type SaleUnit =
  | "piece"
  | "pack"
  | "box"
  | "bottle"
  | "strip"
  | "kg"
  | "g"
  | "liter"
  | "meter"
  | "sheet"
  | "bag"
  | "loaf"
  | "other";

export const SALE_UNIT_OPTIONS: { value: SaleUnit; label: string; hint: string }[] = [
  { value: "piece", label: "Piece / unit", hint: "Sold one by one" },
  { value: "pack", label: "Pack", hint: "Sold as a pack" },
  { value: "box", label: "Box", hint: "Sold as a box" },
  { value: "bottle", label: "Bottle", hint: "Sold by bottle" },
  { value: "strip", label: "Strip", hint: "Blister / tablet strip" },
  { value: "loaf", label: "Loaf", hint: "Bakery loaves" },
  { value: "kg", label: "Kilogram (kg)", hint: "Sold by weight" },
  { value: "g", label: "Gram (g)", hint: "Sold by small weight" },
  { value: "liter", label: "Liter", hint: "Sold by volume" },
  { value: "meter", label: "Meter", hint: "Sold by length (cable, pipe, fabric)" },
  { value: "sheet", label: "Sheet", hint: "Sheets / boards" },
  { value: "bag", label: "Bag", hint: "Cement, flour, feed bags" },
  { value: "other", label: "Other", hint: "Choose a custom unit below" },
];

/** Common custom units shown when Sold as = Other */
export const OTHER_UNIT_OPTIONS = [
  "Carton",
  "Dozen",
  "Sachet",
  "Tin",
  "Jar",
  "Tube",
  "Pair",
  "Set",
  "Bundle",
  "Roll",
  "Can",
  "Sack",
  "Tray",
  "Crate",
  "Piece set",
  "Quintal",
] as const;

export const OTHER_CUSTOM_VALUE = "__custom__";

export function saleUnitLabel(unit?: string | null, custom?: string | null): string {
  if (unit === "other") {
    const name = (custom || "").trim();
    return name || "Other";
  }
  const found = SALE_UNIT_OPTIONS.find((o) => o.value === unit);
  return found?.label ?? "Piece / unit";
}

export function saleUnitShort(unit?: string | null, custom?: string | null): string {
  if (unit === "other") {
    const name = (custom || "").trim();
    if (!name) return "unit";
    return name.length > 8 ? `${name.slice(0, 7)}…` : name.toLowerCase();
  }
  switch (unit) {
    case "pack":
      return "pack";
    case "box":
      return "box";
    case "bottle":
      return "btl";
    case "strip":
      return "strip";
    case "loaf":
      return "loaf";
    case "kg":
      return "kg";
    case "g":
      return "g";
    case "liter":
      return "L";
    case "meter":
      return "m";
    case "sheet":
      return "sht";
    case "bag":
      return "bag";
    case "piece":
    default:
      return "pc";
  }
}

export function otherUnitSelectValue(custom?: string | null): string {
  const name = (custom || "").trim();
  if (!name) return "";
  const match = OTHER_UNIT_OPTIONS.find((o) => o.toLowerCase() === name.toLowerCase());
  return match ?? OTHER_CUSTOM_VALUE;
}
