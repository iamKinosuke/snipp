import Link from "next/link";

import { STATS_RANGES, type StatsRange } from "@/lib/api";
import { cn } from "@/lib/utils";

export function StatsRangeFilter({
  linkId,
  active,
}: {
  linkId: string;
  active: StatsRange;
}) {
  return (
    <nav
      aria-label="Time range"
      className="border-border flex w-fit items-center gap-0.5 rounded-md border p-0.5"
    >
      {STATS_RANGES.map((range) => {
        const isActive = range === active;

        return (
          <Link
            key={range}
            href={`/app/links/${linkId}?range=${range}`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-visible:outline-ring rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2",
              isActive
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Last {range} days
          </Link>
        );
      })}
    </nav>
  );
}
