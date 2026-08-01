import type { DailyClicks, LinkStats } from "@/lib/api";

export interface RangeSummary {
  isExpired: boolean;
  dailyAverage: number;
  busiestDay: DailyClicks | null;
  deltaPercent: number | null;
}

export function summarizeRange(stats: LinkStats): RangeSummary {
  const now = Date.now();

  const busiestDay = stats.daily.reduce<DailyClicks | null>((best, day) => {
    if (day.clicks === 0) return best;
    return best === null || day.clicks > best.clicks ? day : best;
  }, null);

  return {
    isExpired:
      stats.link.expiresAt !== null &&
      new Date(stats.link.expiresAt).getTime() < now,
    dailyAverage: stats.rangeClicks / stats.range,
    busiestDay,
    deltaPercent:
      stats.previousRangeClicks === 0
        ? null
        : ((stats.rangeClicks - stats.previousRangeClicks) /
            stats.previousRangeClicks) *
          100,
  };
}
