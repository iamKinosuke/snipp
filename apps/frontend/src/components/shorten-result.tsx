"use client";

import {
  ArrowUpRightIcon,
  ClockIcon,
  HistoryIcon,
  QrCodeIcon,
} from "lucide-react";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { QrDialog } from "@/components/qr-dialog";
import { Button } from "@/components/ui/button";
import type { CreatedLink } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function ShortenResult({
  link,
  reused = false,
}: {
  link: CreatedLink;
  reused?: boolean;
}) {
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-1 rounded-lg border duration-200 ease-out">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group text-foreground focus-visible:outline-ring inline-flex min-w-0 items-center gap-1.5 rounded-sm font-mono text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className="truncate">{link.shortUrl}</span>
            <ArrowUpRightIcon className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors duration-150" />
          </a>
          <p className="text-muted-foreground truncate text-xs">
            {link.targetUrl}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CopyButton value={link.shortUrl} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQrOpen(true)}
          >
            <QrCodeIcon />
            QR
          </Button>
        </div>
      </div>

      {reused ? (
        <div className="border-border text-muted-foreground flex items-center gap-1.5 border-t px-5 py-2.5 text-xs">
          <HistoryIcon className="size-4 shrink-0" />
          You had already shortened this URL — here is the same short link.
        </div>
      ) : null}

      {link.expiresAt !== null ? (
        <div className="border-border text-muted-foreground flex items-center gap-1.5 border-t px-5 py-2.5 text-xs">
          <ClockIcon className="size-4" />
          Expires {formatDateTime(link.expiresAt)}
        </div>
      ) : null}

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={link.shortUrl}
        shortCode={link.shortCode}
      />
    </div>
  );
}
