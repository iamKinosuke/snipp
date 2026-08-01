"use client";

import { ExternalLinkIcon, QrCodeIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { DeleteLinkDialog } from "@/components/delete-link-dialog";
import { QrDialog } from "@/components/qr-dialog";
import { Button } from "@/components/ui/button";
import type { LinkSummary } from "@/lib/api";

export function LinkDetailActions({ link }: { link: LinkSummary }) {
  const router = useRouter();
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <CopyButton value={link.shortUrl} />

      <Button
        variant="outline"
        size="sm"
        onClick={() => setQrOpen(true)}
        aria-label="Show QR code"
      >
        <QrCodeIcon />
        QR
      </Button>

      <Button variant="outline" size="icon-sm" asChild>
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open short link"
          title="Open short link"
        >
          <ExternalLinkIcon />
        </a>
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
        onDeleted={() => router.replace("/dashboard")}
      />
    </div>
  );
}
