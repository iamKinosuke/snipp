"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  LinkIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";

import { RecentLinks } from "@/components/recent-links";
import { ShortenResult } from "@/components/shorten-result";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  createLink,
  isUnauthorized,
  type CreateLinkResult,
} from "@/lib/api";
import { SHORT_DOMAIN_LABEL } from "@/lib/config";
import {
  clearRecentLinks,
  getRecentLinks,
  getServerRecentLinks,
  rememberRecentLink,
  subscribeRecentLinks,
} from "@/lib/recent-links";
import { expireSession, readSession } from "@/lib/session-client";
import { cn } from "@/lib/utils";

export function ShortenForm({ isSignedIn }: { isSignedIn: boolean }) {
  const aliasId = useId();
  const expiresId = useId();

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<CreateLinkResult | null>(null);
  const [reusedShortCode, setReusedShortCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recent = useSyncExternalStore(
    subscribeRecentLinks,
    getRecentLinks,
    getServerRecentLinks,
  );

  function handleClear() {
    clearRecentLinks();
    setReusedShortCode(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const session = readSession();

    try {
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

      setReusedShortCode(created.reused ? created.shortCode : null);

      if (isSignedIn) {
        setLatest(created);
      } else {
        rememberRecentLink(created);
      }

      setUrl("");
      setAlias("");
      setExpiresAt("");
      setOptionsOpen(false);
    } catch (caught) {
      if (session !== null && isUnauthorized(caught)) {
        expireSession();
        return;
      }

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
              placeholder="Paste long URL here"
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
              "size-4 transition-transform duration-150 ease-out",
              optionsOpen && "rotate-180",
            )}
          />
          Options
        </button>

        {optionsOpen ? (
          <div className="border-border animate-in fade-in-0 slide-in-from-top-1 grid gap-4 rounded-lg border p-4 duration-150 ease-out sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={aliasId}>Custom alias</Label>
              <div className="focus-within:border-ring focus-within:outline-ring/40 border-input flex h-10 cursor-text items-center rounded-md border transition-[color,border-color] duration-150 focus-within:outline-2">
                <label
                  htmlFor={aliasId}
                  aria-hidden
                  className="text-muted-foreground flex h-full shrink-0 cursor-text items-center pl-3 font-mono text-xs select-none"
                >
                  {SHORT_DOMAIN_LABEL}/
                </label>
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
                className="focus:border-ring focus:outline-ring/40 pr-10 text-xs focus:outline-2"
              />
            </div>
          </div>
        ) : null}
      </form>

      {error !== null ? <Alert>{error}</Alert> : null}

      {isSignedIn ? (
        latest !== null ? (
          <div className="flex flex-col gap-2.5">
            <ShortenResult link={latest} reused={latest.reused} />
            <Link
              href="/app"
              className="text-primary focus-visible:outline-ring group inline-flex w-fit items-center gap-1.5 self-end rounded-sm text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              View all your links in the dashboard
              <ArrowRightIcon className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
            </Link>
          </div>
        ) : null
      ) : (
        <RecentLinks
          links={recent}
          reusedShortCode={reusedShortCode}
          onClear={handleClear}
        />
      )}
    </div>
  );
}
