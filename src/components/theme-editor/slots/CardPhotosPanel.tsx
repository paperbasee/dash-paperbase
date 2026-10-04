"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { follows, parentsOf, type CategoryNode, type CategoryTicks } from "@/lib/theme-editor/card-photos";
import { KitGroup, KitNote, KitPanel, KitTickRow } from "../kit";
import { ROUND } from "../kit/styles";

type Node = CategoryNode;

/** Whether this category or any under it is named in the ticks: a fold the merchant has been inside. */
function touched(node: Node, ticks: CategoryTicks): boolean {
  return (node.children ?? []).some((child) => child.public_id in ticks || touched(child, ticks));
}

/**
 * Card photos (owner, 2026-10-04): the shop's own categories, to tick the ones whose cards
 * take each photo's shape. A category with others under it has an arrow that unfolds them, so
 * a merchant can tick a whole department or one sub-category of it -- and untick one inside a
 * ticked department, which ticking the department ticks along with the rest.
 *
 * Folded to begin with, except where the merchant has ticked something inside, so a shop
 * with fifty categories opens on its departments and never hides a choice already made.
 *
 * The rule (a category takes its parent's answer unless it has its own) and the smallest map
 * that says it are `lib/theme-editor/card-photos.ts`; this only draws them.
 */
export function CardPhotosPanel({
  tree,
  failed,
  ticks,
  onToggle,
  onClose,
}: {
  /** The shop's categories; undefined while they load. */
  tree: readonly Node[] | undefined;
  failed: boolean;
  ticks: CategoryTicks;
  onToggle: (publicId: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  const parents = parentsOf(tree ?? []);
  // Which folds the merchant opened or closed; the rest follow `touched`.
  const [folds, setFolds] = useState<Record<string, boolean>>({});

  const rows = (nodes: readonly Node[]) =>
    nodes.map((node) => {
      const children = node.children ?? [];
      const open = folds[node.public_id] ?? touched(node, ticks);
      return (
        <div key={node.public_id} className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <KitTickRow
                label={node.name}
                note={children.length ? children.map((child) => child.name).join(", ") : undefined}
                checked={follows(ticks, node.public_id, parents)}
                onToggle={() => onToggle(node.public_id)}
              />
            </div>
            {children.length ? (
              <button
                type="button"
                className={ROUND}
                aria-expanded={open}
                aria-label={t(open ? "catPhotosFold" : "catPhotosUnfold", { name: node.name })}
                onClick={() => setFolds((all) => ({ ...all, [node.public_id]: !open }))}
              >
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
              </button>
            ) : null}
          </div>
          {children.length && open ? <div className="ml-7 flex flex-col gap-1">{rows(children)}</div> : null}
        </div>
      );
    });

  let list;
  if (failed) list = <KitNote role="alert">{t("catPhotosFailed")}</KitNote>;
  else if (tree === undefined) list = <KitNote role="status">{t("catPhotosLoading")}</KitNote>;
  else if (!tree.length) list = <KitNote>{t("catPhotosNoCategories")}</KitNote>;
  else list = <div className="flex flex-col gap-1">{rows(tree)}</div>;

  return (
    <KitPanel title={t("catPhotos")} hint={t("catPhotosHint")} onClose={onClose} className="h-full">
      <KitGroup title={t("catPhotosList")}>{list}</KitGroup>
      <KitNote>{t("catPhotosNote")}</KitNote>
    </KitPanel>
  );
}
