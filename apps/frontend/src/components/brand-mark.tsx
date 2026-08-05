import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "from-brand-start to-brand-end inline-flex size-6 shrink-0 items-center justify-center rounded-[25%] bg-linear-to-br text-white",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" fill="none" className="size-full">
        <g
          stroke="currentColor"
          strokeWidth={6.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(32 32) scale(1.15) translate(-32 -32)"
        >
          <path d="M44 18 C44 12 20 12 20 22 C20 32 44 32 44 42 C44 50 28 51 21 46" />
          <path d="M27 40 L20 46.5 L26 53" />
        </g>
      </svg>
    </span>
  );
}
