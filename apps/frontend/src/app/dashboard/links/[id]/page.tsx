import { ArrowLeftIcon, ArrowUpRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BreakdownCard } from "@/components/breakdown-card";
import { ClicksBarChart } from "@/components/clicks-bar-chart";
import { LinkDetailActions } from "@/components/link-detail-actions";
import { StatTile } from "@/components/stat-tile";
import { StatsRangeFilter } from "@/components/stats-range-filter";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  getLinkStats,
  STATS_RANGES,
  type StatsRange,
} from "@/lib/api";
import {
  formatAverage,
  formatCompact,
  formatDate,
  formatNumber,
} from "@/lib/format";
import { getServerSession } from "@/lib/session-server";
import { summarizeRange } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Link analytics — Snipp",
};

function parseRange(raw: string | string[] | undefined): StatsRange {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return STATS_RANGES.find((range) => range === value) ?? STATS_RANGES[0];
}

export default async function LinkAnalyticsPage(
  props: PageProps<"/dashboard/links/[id]">,
) {
  const session = await getServerSession();
  if (session === null) {
    redirect("/login");
  }

  const { id } = await props.params;
  const range = parseRange((await props.searchParams).range);

  let stats;
  try {
    stats = await getLinkStats(session.token, id, range);
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      notFound();
    }
    throw caught;
  }

  const { link } = stats;
  const summary = summarizeRange(stats);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-muted-foreground hover:text-foreground -ml-3 w-fit"
      >
        <Link href="/dashboard">
          <ArrowLeftIcon />
          Back to links
        </Link>
      </Button>

      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="truncate font-mono text-xl font-semibold">
                {link.shortCode}
              </h1>
              {summary.isExpired ? (
                <span className="text-muted-foreground border-border shrink-0 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase">
                  Expired
                </span>
              ) : null}
            </div>

            <a
              href={link.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring group inline-flex min-w-0 items-center gap-1.5 rounded-sm text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span className="truncate">{link.targetUrl}</span>
              <ArrowUpRightIcon className="size-3.5 shrink-0" />
            </a>

            <p className="text-muted-foreground text-xs">
              Created {formatDate(link.createdAt)}
              {link.expiresAt !== null
                ? ` · ${summary.isExpired ? "Expired" : "Expires"} ${formatDate(link.expiresAt)}`
                : null}
            </p>
          </div>

          <LinkDetailActions link={link} />
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-5xl font-semibold">
            {formatNumber(stats.totalClicks)}
          </span>
          <span className="text-muted-foreground text-xs">
            Total clicks, all time
          </span>
        </div>
      </header>

      <div className="border-border border-t" />

      <div className="flex flex-col gap-6">
        <StatsRangeFilter linkId={link.id} active={range} />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label={`Clicks in the last ${range} days`}
            value={formatCompact(stats.rangeClicks)}
            delta={
              summary.deltaPercent === null
                ? undefined
                : {
                    percent: summary.deltaPercent,
                    versus: `vs previous ${range} days`,
                  }
            }
          />
          <StatTile
            label="Daily average"
            value={formatAverage(summary.dailyAverage)}
          />
          <StatTile
            label="Busiest day"
            value={formatCompact(summary.busiestDay?.clicks ?? 0)}
            hint={
              summary.busiestDay === null
                ? "No clicks yet"
                : formatDate(summary.busiestDay.date)
            }
          />
        </div>

        <section className="border-border bg-card flex flex-col gap-5 rounded-lg border p-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-medium">Clicks per day</h2>
            <p className="text-muted-foreground text-xs">
              Last {range} days · {formatNumber(stats.rangeClicks)} clicks
            </p>
          </div>

          <ClicksBarChart daily={stats.daily} />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <BreakdownCard
            title="Top referrers"
            items={stats.referrers}
            total={stats.rangeClicks}
            emptyMessage="No referrer data in this period."
          />
          <BreakdownCard
            title="Devices"
            items={stats.devices}
            total={stats.rangeClicks}
            emptyMessage="No device data in this period."
          />
        </div>
      </div>
    </main>
  );
}
