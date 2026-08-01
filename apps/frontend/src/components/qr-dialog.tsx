"use client";

import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import QRCode from "qrcode";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useCopiedFlag } from "@/hooks/use-copy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CANVAS_SIZE = 1024;

function releaseInlineSize(canvas: HTMLCanvasElement): void {
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");
}

const QR_OPTIONS = {
  margin: 4,
  errorCorrectionLevel: "M",
  color: { dark: "#000000", light: "#ffffff" },
} as const;

interface QrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  shortCode: string;
}

function triggerDownload(href: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
}

function getClipboardImageSupport(): boolean {
  return (
    typeof ClipboardItem === "function" &&
    typeof navigator.clipboard?.write === "function"
  );
}

const subscribeNever = () => () => {};
const getServerClipboardImageSupport = () => false;

export function QrDialog({
  open,
  onOpenChange,
  url,
  shortCode,
}: QrDialogProps) {
  const { copied, flash } = useCopiedFlag();

  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCopyImage = useSyncExternalStore(
    subscribeNever,
    getClipboardImageSupport,
    getServerClipboardImageSupport,
  );

  const handleCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    setCanvas(node);
  }, []);

  useEffect(() => {
    if (!open || canvas === null) return;

    let cancelled = false;

    const settle = (message: string | null) => {
      if (cancelled) return;
      setError(message);
      setActionError(null);
    };

    QRCode.toCanvas(canvas, url, { ...QR_OPTIONS, width: CANVAS_SIZE })
      .then(() => {
        releaseInlineSize(canvas);
        settle(null);
      })
      .catch(() => settle("Could not generate a QR code for this link."));

    return () => {
      cancelled = true;
    };
  }, [open, url, canvas]);

  const handleDownloadPng = useCallback(() => {
    if (canvas === null) return;

    triggerDownload(canvas.toDataURL("image/png"), `snipp-${shortCode}.png`);
  }, [canvas, shortCode]);

  const handleDownloadSvg = useCallback(async () => {
    setActionError(null);

    try {
      const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: "svg" });

      triggerDownload(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        `snipp-${shortCode}.svg`,
      );
    } catch {
      setActionError("Could not build the SVG. Try the PNG instead.");
    }
  }, [url, shortCode]);

  const handleCopyImage = useCallback(async () => {
    if (canvas === null) return;

    setActionError(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (blob === null) throw new Error("toBlob returned null");

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      flash();
    } catch {
      setActionError("Could not copy the image. Download it instead.");
    }
  }, [canvas, flash]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR code</DialogTitle>
          <DialogDescription className="truncate font-mono text-xs">
            {url}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5">
          <div className="border-border rounded-lg border bg-white p-3">
            <canvas
              ref={handleCanvasRef}
              aria-label={`QR code for ${url}`}
              role="img"
              className="block size-52 rounded-sm"
            />
          </div>

          {error !== null ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPng}
                  title="Download as PNG"
                >
                  <DownloadIcon />
                  PNG
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownloadSvg()}
                  title="Download as SVG — vector, for print"
                >
                  <DownloadIcon />
                  SVG
                </Button>

                {canCopyImage ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopyImage()}
                    title="Copy image to clipboard"
                  >
                    {copied ? (
                      <CheckIcon className="text-primary" />
                    ) : (
                      <CopyIcon />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                ) : null}
              </div>

              {actionError !== null ? (
                <p className="text-destructive text-center text-xs">
                  {actionError}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
