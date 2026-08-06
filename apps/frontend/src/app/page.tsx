import { ArrowRightIcon, BarChart3Icon, QrCodeIcon, TagIcon } from "lucide-react";
import Link from "next/link";

import { ShortenForm } from "@/components/shorten-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getServerSession } from "@/lib/session-server";

const FEATURES = [
  { icon: BarChart3Icon, label: "Click analytics" },
  { icon: QrCodeIcon, label: "QR codes" },
  { icon: TagIcon, label: "Custom aliases" },
] as const;

export default async function Home() {
  const session = await getServerSession();

  return (
    <>
      <SiteHeader email={session?.email} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold sm:text-5xl">
              Shorter links,
              <br />
              <span className="text-muted-foreground">measurable clicks.</span>
            </h1>
            <p className="text-muted-foreground max-w-md text-base leading-relaxed">
              Paste a long URL, get a short one back.{" "}
              {session === null
                ? "No account needed."
                : "Links are saved to your account."}
            </p>
          </div>

          <ShortenForm isSignedIn={session !== null} />

          <div className="flex flex-col gap-8">
            <ul className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-xs">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="border-border/80 flex flex-col gap-3 rounded-lg border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm">
                {session === null ? (
                  <>
                    <span className="text-foreground font-medium">Sign in</span>{" "}
                    to keep a history of your links and track their clicks.
                  </>
                ) : (
                  <>
                    Your links and their click analytics live in your{" "}
                    <span className="text-foreground font-medium">
                      dashboard
                    </span>
                    .
                  </>
                )}
              </p>
              <Link
                href={session === null ? "/signup" : "/dashboard"}
                className="text-primary focus-visible:outline-ring group inline-flex shrink-0 items-center gap-1.5 rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {session === null ? "Create account" : "Go to dashboard"}
                <ArrowRightIcon className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
