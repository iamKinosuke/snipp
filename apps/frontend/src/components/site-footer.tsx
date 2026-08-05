import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="border-border/80 border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <span className="text-foreground text-xs font-medium">Snipp</span>
          <span className="text-muted-foreground/50" aria-hidden>
            ·
          </span>
          <span className="text-2xs">Short links with click analytics</span>
        </div>

        <span className="text-2xs tabular-nums">
          © {new Date().getFullYear()} Snipp
        </span>
      </div>
    </footer>
  );
}
