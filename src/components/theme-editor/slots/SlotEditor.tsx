"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  initialChoices,
  SLOT_GROUPS,
  SLOT_PAGES,
  type SlotPageKey,
} from "@/lib/theme-editor/slot-catalogue";
import { SlotCanvas } from "./SlotCanvas";
import { StylePanel } from "./StylePanel";

/**
 * The theme editor, rebuilt around slots.
 *
 * **The design, not the wiring.** Nothing here reaches the API: the slots come
 * from `slot-catalogue.ts` and the choices live in this component's state, so
 * the screen can be looked at and argued with before a line of it is saved.
 * When it is wired, the catalogue becomes the theme manifest and these choices
 * become section settings on the shop's draft document -- the shape of this
 * component does not change.
 *
 * What the owner asked for, on 2026-09-20:
 *
 *   no sidebar        the canvas fills the editor
 *   click the page    a merchant clicks the section they want, where it sits
 *   fixed places      nothing drags, nothing reorders; the only choice is what
 *                     goes in each place
 *   premium in view   a paid option shows its badge in the list, so a merchant
 *                     sees what the tier adds before they pay for it
 *
 * The page picker and the phone/desktop toggle are kept from the editor as it
 * stands, because those two were never the problem.
 */
export function SlotEditor() {
  const t = useTranslations("themeEditor.slots");
  const tEditor = useTranslations("themeEditor");

  const [page, setPage] = useState<SlotPageKey>("home");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [open, setOpen] = useState<string | null>("promo");
  const [palette, setPalette] = useState("ivory");
  const [face, setFace] = useState("poppins");
  const [choices, setChoices] = useState<Record<SlotPageKey, Record<string, string>>>(() => ({
    home: initialChoices("home"),
    product: initialChoices("product"),
    checkout: initialChoices("checkout"),
    header: initialChoices("header"),
    footer: initialChoices("footer"),
  }));

  function pickPage(next: SlotPageKey) {
    setPage(next);
    setOpen(null);
  }

  function choose(slotKey: string, value: string) {
    setChoices((all) => ({ ...all, [page]: { ...all[page], [slotKey]: value } }));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <Select
          aria-label={tEditor("pageLabel")}
          value={page}
          onChange={(event) => pickPage(event.target.value as SlotPageKey)}
          className="w-auto min-w-[10rem]"
        >
          <optgroup label={tEditor("pagesGroup")}>
            {SLOT_PAGES.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </optgroup>
          <optgroup label={tEditor("everyPageGroup")}>
            {SLOT_GROUPS.map((key) => (
              <option key={key} value={key}>
                {t(key)}
              </option>
            ))}
          </optgroup>
        </Select>

        <p role="status" className="text-xs text-muted-foreground">
          {open ? t("hintChoosing") : t("hintClick")}
        </p>

        <div className="flex-1" />

        <div
          role="group"
          aria-label={tEditor("previewSize")}
          className="inline-flex overflow-hidden rounded-sm border border-border-subtle"
        >
          {(
            [
              ["desktop", Monitor, tEditor("desktop")],
              ["mobile", Smartphone, tEditor("phone")],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
              title={label}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                device === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <Button type="button" size="sm" disabled title={t("notWiredYet")}>
          {tEditor("saveToShop")}
        </Button>
      </div>

      {/* Said plainly, because a screen that looks finished and saves nothing is worse than one that says so. */}
      <p className="border-b border-border bg-[hsl(var(--accent-yellow)/0.1)] px-3 py-2 text-xs text-muted-foreground">
        {t("designOnly")}
      </p>

      {/*
        Two fifths for colour and type, three for the page.

        With one theme and fixed places, the palette and the face are what make
        two shops look different -- so they are not a tab somewhere, they are
        half the screen. On a narrow window they stack above the page rather
        than squeezing: a 40% column of swatches is unusable at that width.
      */}
      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] lg:grid-cols-[2fr_3fr] lg:grid-rows-1">
        <div className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
          <StylePanel palette={palette} onPalette={setPalette} face={face} onFace={setFace} />
        </div>
        <div className="min-h-0 overflow-y-auto">
          <SlotCanvas
            page={page}
            device={device}
            open={open}
            onOpen={setOpen}
            choices={choices[page]}
            onChoose={choose}
          />
        </div>
      </div>
    </div>
  );
}
