import { cn } from "@/lib/utils";
import { formatExpiryLabel, getExpiryStatus, type ExpiryStatus } from "@/lib/expiry";

const styles: Record<Exclude<ExpiryStatus, "none">, string> = {
  ok: "bg-primary/10 text-primary",
  soon: "bg-warning/15 text-warning-foreground",
  expired: "bg-destructive/10 text-destructive",
};

const labels: Record<Exclude<ExpiryStatus, "none">, string> = {
  ok: "Expires",
  soon: "Expiring soon",
  expired: "Expired",
};

type Props = {
  expiry?: string | Date | null;
  className?: string;
  showDate?: boolean;
};

export function ExpiryBadge({ expiry, className, showDate = true }: Props) {
  const status = getExpiryStatus(expiry);
  if (status === "none") return null;
  const dateLabel = formatExpiryLabel(expiry);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
        styles[status],
        className,
      )}
    >
      {labels[status]}
      {showDate && dateLabel ? <span className="font-medium opacity-90">· {dateLabel}</span> : null}
    </span>
  );
}
