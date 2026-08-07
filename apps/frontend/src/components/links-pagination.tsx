import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface LinksPaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

export function LinksPagination({ page, pageSize, total }: LinksPaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage === 1) return null;

  const firstOnPage = (page - 1) * pageSize + 1;
  const lastOnPage = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4"
    >
      <p className="text-muted-foreground text-xs tabular-nums">
        {firstOnPage}–{lastOnPage} of {total}
      </p>

      <div className="flex items-center gap-2">
        <PageLink page={page - 1} disabled={page <= 1} direction="prev" />
        <PageLink
          page={page + 1}
          disabled={page >= lastPage}
          direction="next"
        />
      </div>
    </nav>
  );
}

function PageLink({
  page,
  disabled,
  direction,
}: {
  page: number;
  disabled: boolean;
  direction: "prev" | "next";
}) {
  const label = direction === "prev" ? "Previous page" : "Next page";
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;

  if (disabled) {
    return (
      <Button variant="outline" size="icon-sm" disabled aria-label={label}>
        <Icon />
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon-sm" asChild>
      <Link
        href={{ pathname: "/app", query: { page } }}
        aria-label={label}
      >
        <Icon />
      </Link>
    </Button>
  );
}
