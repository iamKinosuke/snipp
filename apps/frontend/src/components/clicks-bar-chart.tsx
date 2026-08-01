import type { DailyClicks } from "@/lib/api";
import { formatDate, formatDayShort, formatNumber } from "@/lib/format";

const NICE_STEPS = [1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const;

function niceMax(max: number): number {
  if (max <= 4) return 4;

  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalized = max / magnitude;
  const step = NICE_STEPS.find((candidate) => normalized <= candidate) ?? 10;
  const ceiling = step * magnitude;

  return ceiling % 2 === 0 ? ceiling : ceiling + 1;
}

function shouldLabel(index: number, count: number): boolean {
  if (count <= 10) return true;
  const fromEnd = count - 1 - index;
  return fromEnd % 5 === 0;
}

export function ClicksBarChart({ daily }: { daily: DailyClicks[] }) {
  const peak = Math.max(...daily.map((day) => day.clicks), 0);
  const axisMax = niceMax(peak);
  const ticks = [axisMax, axisMax / 2, 0];

  return (
    <figure className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="text-muted-foreground flex h-48 w-10 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="leading-none whitespace-nowrap">
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            {ticks.map((tick) => (
              <div
                key={tick}
                className="border-border/70 absolute inset-x-0 border-t"
                style={{ top: `${(1 - tick / axisMax) * 100}%` }}
                aria-hidden
              />
            ))}

            <ol className="absolute inset-0 flex items-end gap-0.5">
              {daily.map((day) => (
                <ChartColumn key={day.date} day={day} axisMax={axisMax} />
              ))}
            </ol>
          </div>

          <div className="mt-2.5 flex gap-0.5">
            {daily.map((day, index) => (
              <span
                key={day.date}
                className="text-muted-foreground min-w-0 flex-1 truncate text-center text-[11px]"
              >
                {shouldLabel(index, daily.length) ? formatDayShort(day.date) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Clicks per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatDate(day.date)}</th>
              <td>{formatNumber(day.clicks)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function ChartColumn({
  day,
  axisMax,
}: {
  day: DailyClicks;
  axisMax: number;
}) {
  const heightPercent = axisMax === 0 ? 0 : (day.clicks / axisMax) * 100;

  return (
    <li
      tabIndex={0}
      className="group focus-visible:outline-ring relative flex h-full min-w-0 flex-1 items-end rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label={`${formatDate(day.date)}: ${formatNumber(day.clicks)} clicks`}
    >
      {day.clicks === 0 ? (
        <div className="bg-border mx-auto h-0.5 w-full max-w-6 rounded-full" aria-hidden />
      ) : (
        <div
          className="bg-primary group-hover:bg-primary/85 group-focus-visible:bg-primary/85 mx-auto w-full max-w-6 rounded-t-[4px] transition-colors duration-150"
          style={{ height: `${Math.max(heightPercent, 1.5)}%` }}
          aria-hidden
        />
      )}

      <div
        role="presentation"
        className="border-border bg-popover pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-center whitespace-nowrap opacity-0 shadow-xs transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="block text-xs font-medium">
          {formatNumber(day.clicks)}
          <span className="text-muted-foreground font-normal">
            {day.clicks === 1 ? " click" : " clicks"}
          </span>
        </span>
        <span className="text-muted-foreground block text-[11px]">
          {formatDate(day.date)}
        </span>
      </div>
    </li>
  );
}
