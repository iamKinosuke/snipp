import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  delta?: {
    percent: number;
    versus: string;
  };
  className?: string;
}

export function StatTile({ label, value, hint, delta, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "border-border bg-card flex flex-col gap-1 rounded-lg border p-5",
        className,
      )}
    >
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>

      {delta !== undefined ? (
        <DeltaLine percent={delta.percent} versus={delta.versus} />
      ) : null}

      {hint !== undefined ? (
        <span className="text-muted-foreground text-xs">{hint}</span>
      ) : null}
    </div>
  );
}

function DeltaLine({ percent, versus }: { percent: number; versus: string }) {
  const rounded = Math.round(percent);
  const Icon =
    rounded > 0
      ? ArrowUpRightIcon
      : rounded < 0
        ? ArrowDownRightIcon
        : ArrowRightIcon;

  return (
    <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
      <Icon className="size-3.5" />
      <span className="tabular-nums">{Math.abs(rounded)}%</span>
      <span>{versus}</span>
    </span>
  );
}
