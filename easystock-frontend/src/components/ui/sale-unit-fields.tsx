import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OTHER_CUSTOM_VALUE,
  OTHER_UNIT_OPTIONS,
  SALE_UNIT_OPTIONS,
  otherUnitSelectValue,
  saleUnitShort,
  type SaleUnit,
} from "@/lib/sale-unit";

type SaleUnitFieldsProps = {
  saleUnit: SaleUnit;
  saleUnitCustom: string;
  onSaleUnitChange: (unit: SaleUnit) => void;
  onSaleUnitCustomChange: (custom: string) => void;
  idPrefix?: string;
  compact?: boolean;
};

export function SaleUnitFields({
  saleUnit,
  saleUnitCustom,
  onSaleUnitChange,
  onSaleUnitCustomChange,
  idPrefix = "saleUnit",
  compact = false,
}: SaleUnitFieldsProps) {
  const otherSelect = otherUnitSelectValue(saleUnitCustom);
  const showCustomText = saleUnit === "other" && (otherSelect === OTHER_CUSTOM_VALUE || otherSelect === "");

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={compact ? "space-y-1" : "space-y-2"}>
        <Label htmlFor={idPrefix}>Sold as *</Label>
        <select
          id={idPrefix}
          className={
            compact
              ? "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              : "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          }
          value={saleUnit}
          onChange={(e) => {
            const next = e.target.value as SaleUnit;
            onSaleUnitChange(next);
            if (next !== "other") onSaleUnitCustomChange("");
          }}
        >
          {SALE_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {SALE_UNIT_OPTIONS.find((o) => o.value === saleUnit)?.hint}. Quantity is counted in this unit
          {saleUnit !== "other" ? ` (${saleUnitShort(saleUnit)})` : ""}.
        </p>
      </div>

      {saleUnit === "other" ? (
        <div className={compact ? "space-y-1" : "space-y-2"}>
          <Label htmlFor={`${idPrefix}-other`}>Custom unit *</Label>
          <select
            id={`${idPrefix}-other`}
            className={
              compact
                ? "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                : "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            }
            value={otherSelect}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                onSaleUnitCustomChange("");
                return;
              }
              if (v === OTHER_CUSTOM_VALUE) {
                onSaleUnitCustomChange("");
                return;
              }
              onSaleUnitCustomChange(v);
            }}
          >
            <option value="">Select unit…</option>
            {OTHER_UNIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value={OTHER_CUSTOM_VALUE}>Type your own…</option>
          </select>
          {showCustomText ? (
            <Input
              id={`${idPrefix}-other-text`}
              value={saleUnitCustom}
              onChange={(e) => onSaleUnitCustomChange(e.target.value)}
              placeholder="e.g. Ampoule, Blister"
              className={compact ? "h-9" : "h-11"}
              required
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
