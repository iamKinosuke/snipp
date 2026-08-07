import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { SiteFooter } from "@/components/site-footer";
import { getServerSession } from "@/lib/session-server";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/app">) {
  const session = await getServerSession();

  if (session === null) {
    redirect("/app/login");
  }

  return (
    <>
      <DashboardHeader email={session.email} />
      {children}
      <SiteFooter />
    </>
  );
}
