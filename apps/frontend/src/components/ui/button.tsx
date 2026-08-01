import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity] duration-150 ease-out outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        solid:
          "bg-foreground text-background hover:bg-foreground/85 focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        outline:
          "border border-border bg-transparent hover:bg-secondary focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        ghost:
          "bg-transparent hover:bg-secondary focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        link: "text-foreground underline-offset-4 hover:underline",
        destructive:
          "bg-transparent text-destructive hover:bg-destructive/10 focus-visible:outline-destructive focus-visible:outline-2 focus-visible:outline-offset-2",
      },
      size: {
        sm: "h-8 px-3 text-xs has-[>svg]:px-2.5",
        md: "h-10 px-4 has-[>svg]:px-3.5",
        lg: "h-11 px-5 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
    },
  },
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
