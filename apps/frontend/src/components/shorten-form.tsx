"use client";

import { ChevronDownIcon, LinkIcon, Loader2Icon } from "lucide-react";
import { useId, useState } from "react";

import { ShortenResult } from "@/components/shorten-result";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, createLink, type CreatedLink } from "@/lib/api";
import { SHORT_DOMAIN_LABEL } from "@/lib/config";
import { readSession } from "@/lib/session-client";
import { cn } from "@/lib/utils";

export function ShortenForm() {
  const aliasId = useId();
  const expiresId = useId();

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatedLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const session = readSession();

      const created = await createLink(
        {
          url: url.trim(),
          ...(alias.trim() !== "" ? { alias: alias.trim() } : {}),
          ...(expiresAt !== ""
            ? { expiresAt: new Date(expiresAt).toISOString() }
            : {}),
        },
        session?.token,
      );

      setResult(created);
      setUrl("");
      setAlias("");
      setExpiresAt("");
      setOptionsOpen(false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <LinkIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/a-very-long-path"
              required
              autoComplete="off"
              aria-label="URL to shorten"
              aria-invalid={error !== null}
              className="h-11 pl-9"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting || url.trim() === ""}
            className="sm:w-32"
          >
            {submitting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Shortening
              </>
            ) : (
              "Shorten"
            )}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOptionsOpen((previous) => !previous)}
          aria-expanded={optionsOpen}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring inline-flex w-fit items-center gap-1 rounded-sm text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform duration-150 ease-out",
              optionsOpen && "rotate-180",
            )}
          />
          Options
        </button>

        {optionsOpen ? (
          <div className="border-border animate-in fade-in-0 slide-in-from-top-1 grid gap-4 rounded-lg border p-4 duration-150 ease-out sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={aliasId}>Custom alias</Label>
              <div className="focus-within:border-ring focus-within:outline-ring/40 border-input flex h-10 items-center rounded-md border transition-[color,border-color] duration-150 focus-within:outline-2">
                <span className="text-muted-foreground shrink-0 pl-3 font-mono text-xs">
                  {SHORT_DOMAIN_LABEL}/
                </span>
                <Input
                  id={aliasId}
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  placeholder="portfolio"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-full border-0 pl-1 font-mono text-xs focus-visible:outline-0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={expiresId}>Expires at</Label>
              <Input
                id={expiresId}
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        ) : null}
      </form>

      {error !== null ? <Alert>{error}</Alert> : null}

      {result !== null ? <ShortenResult link={result} /> : null}
    </div>
  );
}
