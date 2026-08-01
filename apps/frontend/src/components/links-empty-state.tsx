import { ArrowRightIcon, LinkIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LinksEmptyState() {
  return (
    <div className="border-border flex flex-col items-center gap-5 rounded-lg border border-dashed px-6 py-20 text-center">
      <div className="border-border text-muted-foreground flex size-11 items-center justify-center rounded-full border">
        <LinkIcon className="size-4.5" />
      </div>

      <div className="flex max-w-xs flex-col gap-1.5">
        <p className="text-base font-medium">No links yet</p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Shorten your first URL and it will show up here with its click count.
        </p>
      </div>

      <Button variant="primary" size="sm" asChild className="mt-1">
        <Link href="/">
          Create a link
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}
