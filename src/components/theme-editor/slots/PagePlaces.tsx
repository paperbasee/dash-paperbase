"use client";

import type { ReactNode } from "react";
import { ChevronRight, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { KitGroup } from "../kit";
import { ROW } from "../kit/styles";

export type PlaceRow = {
  /** `page:key`, the place's own name. */
  id: string;
  name: string;
  /** What it is set to, in the merchant's words; empty for a place that holds words or pictures. */
  value: string;
  locked: boolean;
};

/**
 * Every place on the page, top to bottom, beside the shop (2026-09-26).
 *
 * The shop in the middle is the way in for most of them: point at the logo, click, change it. But
 * the real page cannot show a place set to nothing, the message for an empty cart while the cart
 * is full, or whether the header stays on screen -- so they are all here too, grouped as the page
 * is: the header, the page itself, the footer.
 */
export function PagePlaces({
  groups,
  openId,
  onOpen,
}: {
  groups: { title: ReactNode; rows: PlaceRow[] }[];
  /** The place whose settings are showing, if any. */
  openId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      {groups.map((group, index) => (
        <KitGroup key={index} title={group.title}>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {group.rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  data-place={row.id}
                  aria-current={openId === row.id ? "true" : undefined}
                  onClick={() => onOpen(row.id)}
                  className={cn(ROW, "py-2", openId === row.id && "bg-muted")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">{row.name}</span>
                    {row.value ? <span className="block truncate text-[12px] text-muted-foreground">{row.value}</span> : null}
                  </span>
                  {row.locked ? <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </KitGroup>
      ))}
    </>
  );
}
