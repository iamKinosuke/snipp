"use client";

import {
  ArrowUpRightIcon,
  BarChart3Icon,
  QrCodeIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { DeleteLinkDialog } from "@/components/delete-link-dialog";
import { LinksEmptyState } from "@/components/links-empty-state";
import { QrDialog } from "@/components/qr-dialog";
import { Button } from "@/components/ui/button";
import { formatDate, formatIsoTooltip, formatNumber } from "@/lib/format";
import type { LinkRow } from "@/lib/links";

const GRID = "sm:grid-cols-[minmax(0,1fr)_4rem_6.5rem_8.5rem]";

export function LinksTable({ initialRows }: { initialRows: LinkRow[] }) {
  const [rows, setRows] = useState(initialRows);

  if (rows.length === 0) {
    return <LinksEmptyState />;
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div
        className={`text-muted-foreground border-border bg-muted/40 hidden border-b px-5 py-2.5 text-xs font-medium sm:grid sm:gap-4 ${GRID}`}
      >
        <span>Link</span>
        <span className="text-right">Clicks</span>
        <span>Created</span>
        <span className="sr-only">Actions</span>
      </div>

      <ul className="divide-border divide-y">
        {rows.map((row) => (
          <LinkTableRow
            key={row.link.id}
            row={row}
            onDeleted={(id) =>
              setRows((previous) =>
                previous.filter((candidate) => candidate.link.id !== id),
              )
            }
          />
        ))}
      </ul>
    </div>
  );
}

function LinkTableRow({
  row,
  onDeleted,
}: {
  row: LinkRow;
  onDeleted: (id: string) => void;
}) {
  const { link, isExpired } = row;
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <li
      className={`hover:bg-muted/30 flex flex-col gap-3 px-5 py-4 transition-colors duration-150 sm:grid sm:items-center sm:gap-4 ${GRID}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group focus-visible:outline-ring inline-flex min-w-0 items-center gap-1.5 rounded-sm font-mono text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <span className="truncate">{link.shortCode}</span>
            <ArrowUpRightIcon className="text-muted-foreground group-hover:text-primary size-3.5 shrink-0 transition-colors duration-150" />
          </a>
          {isExpired ? (
            <span className="text-muted-foreground border-border shrink-0 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">
              Expired
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground truncate text-xs" title={link.targetUrl}>
          {link.targetUrl}
        </p>
      </div>

      <div className="flex items-center gap-4 sm:contents">
        <span className="text-sm tabular-nums sm:text-right">
          {formatNumber(link.clickCount)}
        </span>

        <span
          className="text-muted-foreground text-xs"
          title={formatIsoTooltip(link.createdAt)}
        >
          {formatDate(link.createdAt)}
        </span>

        <div className="ml-auto flex items-center gap-0.5 sm:ml-0 sm:justify-end">
          <CopyButton value={link.shortUrl} iconOnly variant="ghost" />

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setQrOpen(true)}
            aria-label="Show QR code"
            title="Show QR code"
            className="text-muted-foreground hover:text-foreground"
          >
            <QrCodeIcon />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            className="text-muted-foreground hover:text-foreground"
          >
            <Link
              href={`/dashboard/links/${link.id}`}
              aria-label="View analytics"
              title="View analytics"
            >
              <BarChart3Icon />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete link"
            title="Delete link"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>

      <QrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={link.shortUrl}
        shortCode={link.shortCode}
      />
      <DeleteLinkDialog
        link={link}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={onDeleted}
      />
    </li>
  );
}
