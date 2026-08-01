import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "text-foreground focus-visible:outline-ring inline-flex items-baseline gap-px rounded-sm text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4",
        className,
      )}
    >
      snipp
      <span className="text-primary" aria-hidden>
        /
      </span>
    </Link>
  );
}
