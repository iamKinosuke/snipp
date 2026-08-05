"use client";

import { ShortenResult } from "@/components/shorten-result";
import type { CreatedLink } from "@/lib/api";
import { MAX_RECENT_LINKS } from "@/lib/recent-links";

interface RecentLinksProps {
  links: readonly CreatedLink[];
  reusedShortCode: string | null;
  onClear: () => void;
}

export function RecentLinks({
  links,
  reusedShortCode,
  onClear,
}: RecentLinksProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Recent links
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-sm text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {links.map((link) => (
          <ShortenResult
            key={link.shortCode}
            link={link}
            reused={link.shortCode === reusedShortCode}
          />
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        Saved in this browser only — the last {MAX_RECENT_LINKS} links. Sign in
        to keep them for good.
      </p>
    </div>
  );
}
