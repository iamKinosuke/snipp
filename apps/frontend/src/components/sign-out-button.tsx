"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/session-client";

export function SignOutButton() {
  const router = useRouter();

  function handleSignOut() {
    clearSession();
    router.replace("/");
    router.refresh();
  }

  return (
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
  );
}
