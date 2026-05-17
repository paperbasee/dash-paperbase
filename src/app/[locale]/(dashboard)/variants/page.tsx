import { Suspense } from "react";
import VariantsPageClient from "./variants-client";

export default function VariantsPage() {
  return (
    <Suspense fallback={null}>
      <VariantsPageClient />
    </Suspense>
  );
}
