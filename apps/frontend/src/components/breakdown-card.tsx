import type { BreakdownItem } from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/format";

interface BreakdownCardProps {
  title: string;
  items: BreakdownItem[];
  total: number;
  emptyMessage: string;
}

export function BreakdownCard({
  title,
  items,
  total,
  emptyMessage,
}: BreakdownCardProps) {
  const peak = Math.max(...items.map((item) => item.clicks), 0);

  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-lg border p-5">
      <h2 className="text-sm font-medium">{title}</h2>

      {items.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-xs">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-xs" title={item.label}>
                  {item.label}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatNumber(item.clicks)}
                  <span className="ml-1.5">{formatPercent(item.clicks, total)}</span>
                </span>
              </div>

              <div
                className="bg-muted h-1.5 overflow-hidden rounded-full"
                role="presentation"
              >
                <div
                  className="bg-primary h-full rounded-full"
                  style={{
                    width: `${peak === 0 ? 0 : (item.clicks / peak) * 100}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
