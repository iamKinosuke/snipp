"use client";

import { CheckIcon, CopyIcon } from "lucide-react";

import { useCopy } from "@/hooks/use-copy";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends Omit<ButtonProps, "children" | "onClick"> {
  value: string;
  iconOnly?: boolean;
}

export function CopyButton({
  value,
  iconOnly = false,
  variant = "outline",
  size,
  className,
  ...props
}: CopyButtonProps) {
  const { copied, copy } = useCopy();

  return (
    <Button
      type="button"
      variant={variant}
      size={size ?? (iconOnly ? "icon-sm" : "sm")}
      onClick={() => void copy(value)}
      aria-label={iconOnly ? "Copy short link" : undefined}
      title={iconOnly ? "Copy short link" : undefined}
      className={cn(
        iconOnly && "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {copied ? <CheckIcon className="text-primary" /> : <CopyIcon />}
      {iconOnly ? null : <span>{copied ? "Copied" : "Copy"}</span>}
    </Button>
  );
}
