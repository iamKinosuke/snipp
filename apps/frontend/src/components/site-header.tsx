import { LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader({ email }: { email?: string }) {
  return (
    <header className="border-border/80 border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Brand />
        <div className="flex min-w-0 items-center gap-1">
          {email !== undefined ? (
            <span
              className="text-muted-foreground hidden max-w-[16rem] truncate px-2 text-xs sm:block"
              title={email}
            >
              {email}
            </span>
          ) : null}

          <Button variant="ghost" size="sm" asChild>
            {email !== undefined ? (
              <Link href="/app">
                <LayoutDashboardIcon />
                Dashboard
              </Link>
            ) : (
              <Link href="/app/login">Sign in</Link>
            )}
          </Button>

          <ThemeToggle />

          {email !== undefined ? <SignOutButton /> : null}
        </div>
      </div>
    </header>
  );
}
