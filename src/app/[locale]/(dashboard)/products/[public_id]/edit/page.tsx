import type { Metadata } from "next";
import { dashboardSegmentTitle } from "@/lib/dashboard-document-title";
import ProductDetailClient from "../product-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return dashboardSegmentTitle(locale, "productEdit");
}

export default function ProductEditPage() {
  return <ProductDetailClient />;
}
