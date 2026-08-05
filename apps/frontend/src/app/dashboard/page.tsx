import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { LinksPagination } from "@/components/links-pagination";
import { LinksTable } from "@/components/links-table";
import {
  ApiError,
  isUnauthorized,
  LINKS_PAGE_SIZE,
  listLinks,
  type LinksPage,
} from "@/lib/api";
import { toLinkRows } from "@/lib/links";
import {
  EXPIRED_SESSION_PARAM,
  EXPIRED_SESSION_VALUE,
} from "@/lib/session";
import { getServerSession } from "@/lib/session-server";

export const metadata: Metadata = {
  title: "Dashboard — Snipp",
};

function parsePage(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const session = await getServerSession();

  if (session === null) {
    redirect("/login");
  }

  const page = parsePage((await props.searchParams).page);

  let data: LinksPage | null = null;
  let error: string | null = null;

  try {
    data = await listLinks(session.token, page, LINKS_PAGE_SIZE);
  } catch (caught) {
    if (isUnauthorized(caught)) {
      redirect(`/login?${EXPIRED_SESSION_PARAM}=${EXPIRED_SESSION_VALUE}`);
    }

    error =
      caught instanceof ApiError
        ? caught.message
        : "Could not load your links.";
  }

  if (data !== null && data.total > 0 && data.items.length === 0 && page > 1) {
    redirect("/dashboard");
  }

  const rows = toLinkRows(data?.items ?? []);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 sm:py-14">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold">Your links</h1>
        <p className="text-muted-foreground text-sm">
          {data === null
            ? "Every link you have created, with its click count."
            : `${data.total} ${data.total === 1 ? "link" : "links"}, newest first.`}
        </p>
      </div>

      {error !== null ? <Alert>{error}</Alert> : null}

      {data !== null ? (
        <div className="flex flex-col gap-4">
          <LinksTable key={page} initialRows={rows} />
          <LinksPagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
          />
        </div>
      ) : null}
    </main>
  );
}
