import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-background flex h-10 w-full min-w-0 rounded-md border px-3 py-2 text-sm transition-[color,border-color] duration-150 ease-out outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:outline-ring/40 focus-visible:outline-2 focus-visible:outline-offset-0",
        "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:[color-scheme:dark]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
