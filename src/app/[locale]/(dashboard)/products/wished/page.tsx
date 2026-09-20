"use client";

// What shoppers saved — its own address, in the Catalog group beside Products.

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Undo2 } from "lucide-react";
import { MostWishedForTab } from "../sections/MostWishedForTab";

export default function MostWishedForPage() {
  const router = useRouter();
  const tPages = useTranslations("pages");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={tPages("goBack")}
            className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
        <h1 className="text-2xl font-medium leading-relaxed text-foreground">
          {tPages("productsTabMostWishedFor")}
        </h1>
      </div>
      <MostWishedForTab />
    </div>
  );
}
