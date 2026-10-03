"use client";

// What shoppers saved — its own address, in the Catalog group beside Products.

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page/PageHeader";
import { MostWishedForTab } from "../sections/MostWishedForTab";

export default function MostWishedForPage() {
  const tPages = useTranslations("pages");
  const tHints = useTranslations("pageHints");

  return (
    <div className="space-y-6">
      <PageHeader
        title={tPages("productsTabMostWishedFor")}
        hint={
          <>
            <p>{tHints("mostWishedFor")}</p>
            <p className="text-muted-foreground">{tHints("mostWishedForScope")}</p>
          </>
        }
      />
      <MostWishedForTab />
    </div>
  );
}
