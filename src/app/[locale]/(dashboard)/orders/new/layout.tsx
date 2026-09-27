import { Suspense } from "react";
import type { Metadata } from "next";
import { dashboardSegmentTitle } from "@/lib/dashboard-document-title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return dashboardSegmentTitle(locale, "orderNew");
}

// The form reads `?abandoned=` (converting an abandoned checkout), and a page
// that reads the address's search params needs a Suspense boundary to render.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
