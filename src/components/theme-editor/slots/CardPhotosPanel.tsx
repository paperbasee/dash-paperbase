"use client";

import { useTranslations } from "next-intl";

import type { CategoryNode } from "@/lib/theme-editor/card-photos";
import { KitGroup, KitNote, KitPanel, KitTickRow } from "../kit";

/**
 * Card photos (owner, 2026-10-04): the shop's main categories, to tick the ones whose cards
 * take each photo's shape. Main categories only ("only the parent categories can be
 * selected"): each row names the categories under it, which the tick covers.
 *
 * What a tick writes is `lib/theme-editor/card-photos.ts`; this only draws the list.
 */
export function CardPhotosPanel({
  tree,
  failed,
  picked,
  onToggle,
  onClose,
}: {
  /** The shop's categories; undefined while they load. */
  tree: readonly CategoryNode[] | undefined;
  failed: boolean;
  picked: readonly string[];
  onToggle: (publicId: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor.slots");

  let list;
  if (failed) list = <KitNote role="alert">{t("catPhotosFailed")}</KitNote>;
  else if (tree === undefined) list = <KitNote role="status">{t("catPhotosLoading")}</KitNote>;
  else if (!tree.length) list = <KitNote>{t("catPhotosNoCategories")}</KitNote>;
  else
    list = (
      <div className="flex flex-col gap-1">
        {tree.map((node) => (
          <KitTickRow
            key={node.public_id}
            label={node.name}
            note={node.children?.length ? node.children.map((child) => child.name).join(", ") : undefined}
            checked={picked.includes(node.public_id)}
            onToggle={() => onToggle(node.public_id)}
          />
        ))}
      </div>
    );

  return (
    <KitPanel title={t("catPhotos")} hint={t("catPhotosHint")} onClose={onClose} className="h-full">
      <KitGroup title={t("catPhotosList")}>{list}</KitGroup>
      <KitNote>{t("catPhotosNote")}</KitNote>
    </KitPanel>
  );
}
