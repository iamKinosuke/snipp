"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, deleteLink, type LinkSummary } from "@/lib/api";
import { readSession } from "@/lib/session-client";

interface DeleteLinkDialogProps {
  link: LinkSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}

export function DeleteLinkDialog({
  link,
  open,
  onOpenChange,
  onDeleted,
}: DeleteLinkDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const session = readSession();
    if (session === null) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteLink(session.token, link.id);
      onDeleted(link.id);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not delete this link. Please try again.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this link?</DialogTitle>
          <DialogDescription>
            <span className="text-foreground font-mono">/{link.shortCode}</span>{" "}
            will stop resolving immediately and its click history is deleted with
            it. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error !== null ? <Alert>{error}</Alert> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={deleting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="border-destructive/30 border"
          >
            {deleting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Deleting
              </>
            ) : (
              "Delete link"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
