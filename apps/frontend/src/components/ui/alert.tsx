import { AlertTriangleIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Alert({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "text-destructive border-destructive/30 bg-destructive/5 flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm",
        className,
      )}
      {...props}
    >
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export { Alert };
