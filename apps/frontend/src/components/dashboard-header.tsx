"use client";

import { LogOutIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/session-client";

export function DashboardHeader({ email }: { email: string }) {
  const router = useRouter();

  function handleSignOut() {
    clearSession();
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="border-border/80 border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Brand />

        <div className="flex min-w-0 items-center gap-1">
          <span
            className="text-muted-foreground hidden max-w-[16rem] truncate px-2 text-xs sm:block"
            title={email}
          >
            {email}
          </span>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <PlusIcon />
              <span className="hidden sm:inline">New link</span>
            </Link>
          </Button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOutIcon />
          </Button>
        </div>
      </div>
    </header>
  );
}
