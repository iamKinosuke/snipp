import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "text-foreground focus-visible:outline-ring inline-flex items-center gap-2 rounded-sm text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4",
        className,
      )}
    >
      <BrandMark className="size-[1.55em]" />
      <span className="inline-flex items-baseline gap-px">
        Snipp
        <span className="text-primary" aria-hidden>
          /
        </span>
      </span>
    </Link>
  );
}
