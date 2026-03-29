import type { Metadata } from "next";
import { dashboardSegmentTitle } from "@/lib/dashboard-document-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return dashboardSegmentTitle(locale, "activities");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
