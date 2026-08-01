export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatDayShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatIsoTooltip(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) < 10_000) return formatNumber(value);

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatAverage(value: number): string {
  return value % 1 === 0 ? formatNumber(value) : value.toFixed(1);
}

export function formatPercent(part: number, whole: number): string {
  if (whole === 0) return "0%";
  const percent = (part / whole) * 100;
  return `${percent < 1 ? percent.toFixed(1) : Math.round(percent)}%`;
}
