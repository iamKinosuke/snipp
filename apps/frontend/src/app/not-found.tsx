import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <Brand />

        <div className="flex flex-col gap-1.5">
          <p className="text-2xl font-semibold">Not found</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This page does not exist, or the link it points to has been deleted.
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeftIcon />
            Back to home
          </Link>
        </Button>
      </div>
    </main>
  );
}
