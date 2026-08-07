import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/">
            <ArrowLeftIcon />
            Home
          </Link>
        </Button>
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 pt-4 pb-20">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Brand className="self-center text-base" />
          {children}
        </div>
      </main>
    </div>
  );
}
