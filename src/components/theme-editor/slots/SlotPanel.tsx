"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import type { ThemeBlock, ThemeDocument, ThemeImage, ThemeManifest } from "@/lib/theme-editor/api";
import { foldsFor } from "@/lib/theme-editor/folds";
import { blockFields, fieldValue, sectionFields } from "@/lib/theme-editor/field-specs";
import type { FieldOption } from "@/lib/theme-editor/field-specs";
import { LINK_PAGES } from "@/lib/theme-editor/link-targets";
import type { FieldSpec } from "@/lib/theme-editor/field-specs";
import type { Slot, SlotPageKey } from "@/lib/theme-editor/slot-catalogue";
import {
  ownerOf,
  placeParts,
  sectionFor,
  settingsClaimedElsewhere,
  settingsDecidedOn,
  slotValueFor,
  tickedParts,
  type WiredSlot,
} from "@/lib/theme-editor/slot-sections";
import {
  KitAdd,
  KitBadge,
  KitChoice,
  KitFold,
  KitGroup,
  KitNote,
  KitPanel,
  KitPart,
  KitPicked,
  KitShape,
  type KitPictureWords,
} from "../kit";
import { EditorSheet } from "../EditorSheet";
import { LinkPicker } from "../LinkPicker";
import { PicturePicker } from "../PicturePicker";
import { ChoicePicker } from "../ChoicePicker";
import { ProductPicker } from "../ProductPicker";
import { SettingField } from "../SettingField";

/** What the merchant is being asked for, over the panel: a link, a picture, a product. */
type Asked =
  | { kind: "link"; setting: string; value: string; blockId?: string }
  | { kind: "picture"; setting: string; value: string; blockId?: string; svg?: boolean }
  | { kind: "product"; setting: string; value: string; blockId?: string };

/**
 * A wired place, edited in the editor's side panel (owner, 2026-09-26).
 *
 * It was a pop-up in the middle of the screen (2026-09-22), which covered the
 * very thing being changed: a merchant closed it to look, and opened it again.
 * Now the page stays in view and changes as they type, the way every store
 * builder a merchant may have used works -- and on a phone the same panel rises
 * from the bottom.
 *
 * Three parts, in the order a merchant thinks about them: what this place is,
 * then the settings of that, then the things inside it -- the hero's pictures,
 * a FAQ's questions. Drawn from the editor kit only: the everyday settings
 * open, the rest folded a tap away (`lib/theme-editor/folds.ts`). Add, remove
 * and move are buttons; nothing drags.
 */
export function SlotPanel({
  slot,
  page,
  wiring,
  manifest,
  document,
  premiumSections,
  pictures,
  pictureUrl,
  productName,
  departments,
  onChoose,
  onSet,
  onSetBlock,
  onSetBlocks,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onPictureUrl,
  onClose,
}: {
  slot: Slot;
  /** The canvas entry this place was clicked on, for the settings other places decide. */
  page: SlotPageKey;
  wiring: WiredSlot;
  manifest: ThemeManifest;
  document: ThemeDocument;
  /** Whether this shop's plan includes the theme's paid sections. */
  premiumSections: boolean;
  /** Pictures this shop has already placed, for the picker to offer. */
  pictures: ThemeImage[];
  /** A picture key this shop uploaded, to the URL it draws from. */
  pictureUrl: (key: string) => string;
  /** A product's public id to its name, for the field to show what it holds. */
  productName: (publicId: string) => string;
  /**
   * This shop's own top-level departments, for the place that picks three.
   *
   * The shop's list, not the theme's: no theme can know what a merchant called
   * their aisles. Top-level only -- the owner's decision, 2026-09-23 -- and a
   * picked one carries everything filed beneath it.
   */
  departments: FieldOption[];
  onChoose: (value: string) => void;
  onSet: (setting: string, value: unknown) => void;
  onSetBlock: (blockId: string, setting: string, value: unknown) => void;
  /** Every part at once, for a place that is ticked from a list. */
  onSetBlocks: (blockType: string, setting: string, values: string[]) => void;
  onAddBlock: (blockType: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock: (blockId: string, to: number) => void;
  /** A picture just uploaded, and where it is: so the canvas draws it before a save. */
  onPictureUrl?: (key: string, url: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("themeEditor.slots");
  const tEditor = useTranslations("themeEditor");
  const tKit = useTranslations("themeEditor.kit");
  const locale = useLocale();
  const [asked, setAsked] = useState<Asked | null>(null);
  const [picking, setPicking] = useState(false);

  const section = sectionFor(document, wiring);
  const chosen = slotValueFor(document, wiring);
  const spec = section ? manifest.sections[section.type] : undefined;
  /**
   * The settings no place on this page decides with its tiles.
   *
   * A place whose choices are shapes of one section sets that section's shape
   * by the tiles at the top -- so drawing the same setting again as a field
   * below them is one decision with two controls, which is what the owner met
   * on 2026-09-23: "Picture behind the words" as a tile, and a "Shape"
   * dropdown under it saying the same thing.
   *
   * The whole page, not this place: the category page is the first where two
   * places share a section -- the heading's shape and its count are both
   * `category_header` -- and asking only the open place would draw each one's
   * decision as a field in the other's dialog.
   */
  const decided = section ? settingsDecidedOn(page, section.type) : new Set<string>();
  // And the words another place on this page owns: the blog's name belongs to
  // its heading, not to every place that shares the blog's section.
  const claimed = section
    ? settingsClaimedElsewhere(page, section.type, ownerOf(page, slot))
    : new Set<string>();
  const specs = section
    ? sectionFields(manifest, section.type, locale).filter(
        (field) => !decided.has(field.id) && !claimed.has(field.id),
      )
    : [];
  // The parts this place edits, and where one lands when it moves: see
  // `placeParts` -- the buying column holds several kinds of part.
  const {
    blockType,
    blocks,
    every: everyBlock,
    stepTo,
  } = placeParts(section, Object.keys(spec?.blocks ?? {}), wiring);
  const most = spec?.max_blocks;
  // The theme's cap is on the section's parts, every kind of them.
  const full = typeof most === "number" && everyBlock.length >= most;

  /** Whether every shape of this place is paid -- the promotion, today. */
  const allPaid =
    (slot.options ?? []).length > 0 &&
    (slot.options ?? [])
      .filter((option) => option.value !== wiring.off)
      .every((option) => option.premium);

  const held = (settings: Record<string, unknown> | undefined, setting: string) => {
    const value = settings?.[setting];
    return typeof value === "string" ? value : "";
  };

  const ask = (kind: Asked["kind"], spec_: FieldSpec, blockId?: string) =>
    setAsked({
      kind,
      setting: spec_.id,
      value: held(blockId ? blocks.find((b) => b.id === blockId)?.settings : section?.settings, spec_.id),
      blockId,
      ...(kind === "picture" ? { svg: spec_.svg } : {}),
    } as Asked);

  const answer = (value: string) => {
    if (!asked) return;
    if (asked.blockId) onSetBlock(asked.blockId, asked.setting, value);
    else onSet(asked.setting, value);
    setAsked(null);
  };

  /**
   * The words for this place's parts: a picture, a question, a row. They were
   * a picture's for every place, so the home page's questions offered to "Add
   * a picture", and so did the product page's rows (owner, 2026-09-25).
   */
  const partWords = (word: "Add" | "Number" | "Remove", values?: { number: number }) =>
    t(`${blockType}Part${word}`, values);

  const fieldsFor = (block: ThemeBlock) =>
    section ? blockFields(manifest, section.type, block.type, locale) : [];

  /** Ticked from a list, or built one part at a time: see `tickedParts`. */
  const ticked = section && blockType ? tickedParts(spec?.blocks?.[blockType]?.settings) : null;
  const ticklist = ticked && blockType ? { blockType, setting: ticked.setting, kind: ticked.kind } : null;
  /**
   * What a ticked list offers.
   *
   * A `select` is the THEME's own list -- the sixteen promises, labelled in the
   * manifest. A `category` is the SHOP's: its top-level departments, handed in,
   * because no theme can know what a merchant called their aisles.
   */
  const choices =
    ticklist?.kind === "category"
      ? departments
      : ticklist?.kind === "select" && section
        ? (blockFields(manifest, section.type, ticklist.blockType, locale).find(
            (field) => field.id === ticklist.setting,
          )?.options ?? [])
        : [];
  const ticksFromAList = ticklist?.kind === "select" || ticklist?.kind === "category";
  const picked = ticklist
    ? blocks
        .map((block) => block.settings[ticklist.setting])
        .filter((value): value is string => typeof value === "string" && value !== "")
    : [];
  /** What a ticked part is called, for the card that holds its details. */
  const pickedName = (value: string) =>
    ticklist?.kind === "product"
      ? productName(value)
      : (choices.find((choice) => choice.value === value)?.label ?? value);
  /** A ticked part's details: every setting of it but the choice itself. */
  const detailsOf = (block: ThemeBlock) =>
    ticked ? fieldsFor(block).filter((field) => ticked.details.includes(field.id)) : [];

  /**
   * One place's settings, or one part's, drawn with the folds that apply to
   * them: a picture with words of its own is drawn with those words on it, and
   * the fields that write them fold away under it.
   */
  const drawFields = (fields: FieldSpec[], settings: Record<string, unknown> | undefined, blockId?: string) => {
    const folds = foldsFor(fields.map((field) => field.id));
    const folded = new Set(folds.flatMap((fold) => fold.fields));
    const field = (fieldSpec: FieldSpec, words?: KitPictureWords) => (
      <SettingField
        key={fieldSpec.id}
        spec={fieldSpec}
        value={fieldValue(fieldSpec, settings)}
        onChange={(value) => (blockId ? onSetBlock(blockId, fieldSpec.id, value) : onSet(fieldSpec.id, value))}
        onPickLink={() => ask("link", fieldSpec, blockId)}
        onPickPicture={() => ask("picture", fieldSpec, blockId)}
        onPickProduct={() => ask("product", fieldSpec, blockId)}
        pictureUrl={pictureUrl}
        productName={productName}
        words={words}
      />
    );
    return fields.map((fieldSpec) => {
      if (folded.has(fieldSpec.id)) return null;
      const fold = folds.find((one) => one.after === fieldSpec.id);
      if (!fold) return field(fieldSpec);
      const words = fold.words
        ? {
            heading: held(settings, fold.words.heading),
            line: held(settings, fold.words.line),
            button: held(settings, fold.words.button),
          }
        : undefined;
      return (
        <div key={fieldSpec.id} className="flex flex-col gap-3">
          {field(fieldSpec, words)}
          <KitFold label={tKit(fold.label)} icon={<Pencil className="size-3.5" aria-hidden />}>
            {fields.filter((one) => fold.fields.includes(one.id)).map((one) => field(one))}
          </KitFold>
        </div>
      );
    });
  };

  /** A part, folded: the first words it holds, so a merchant can tell it from its neighbours. */
  const summaryOf = (block: ThemeBlock) => {
    for (const fieldSpec of fieldsFor(block)) {
      const value = held(block.settings, fieldSpec.id).trim();
      if (!value) continue;
      if (fieldSpec.kind === "text" || fieldSpec.kind === "textarea") return value;
      if (fieldSpec.kind === "url") {
        const page = LINK_PAGES.find((entry) => entry.path === value);
        return page ? tEditor(page.key) : value;
      }
    }
    return "";
  };

  /** What a ticked list is called: the shop's products, its departments, the theme's own list. */
  const pickedLabel =
    ticklist?.kind === "product"
      ? tKit("pickedProducts")
      : ticklist?.kind === "category"
        ? tKit("pickedCategories")
        : tKit("pickedChoices");

  const options = slot.options ?? [];

  return (
    <>
      <KitPanel title={t(slot.label)} hint={t(slot.hint ?? "wiredHint")} onClose={onClose} className="h-full">
        {/*
          What this place IS, first: everything under it belongs to the answer,
          and a merchant who wants it gone should not have to read five fields to
          find that out. A place with one answer draws no chooser at all -- the
          three departments are always three departments.
        */}
        {options.length > 0 ? (
          <KitChoice
            label={t(slot.label)}
            value={chosen}
            onChange={onChoose}
            options={options.map((option) => {
              const locked = Boolean(option.premium) && !premiumSections;
              return {
                value: option.value,
                label: t(option.label),
                note: option.note ? t(option.note) : undefined,
                // Five header designs are shapes to compare; two answers are words.
                mark: options.length > 3 ? <KitShape shape={option.shape} /> : undefined,
                // When every shape is paid, that is said once below, not on each.
                badge: option.premium && !allPaid ? <KitBadge>{t("premium")}</KitBadge> : undefined,
                disabled: locked,
                title: locked ? tEditor("premiumSection") : undefined,
              };
            })}
          />
        ) : null}

        {allPaid ? <KitNote>{premiumSections ? t("placeIsPaid") : tEditor("premiumSection")}</KitNote> : null}

        {specs.length ? <div className="flex flex-col gap-6">{drawFields(specs, section?.settings)}</div> : null}

        {/* Ticked from a list: see `tickedParts`. Each ticked one's details under it. */}
        {section && ticklist ? (
          <div className="flex flex-col gap-6">
            <KitPicked
              label={pickedLabel}
              count={t("partsChosen", { count: picked.length })}
              names={picked.slice(0, 3).map(pickedName)}
              onEdit={() => setPicking(true)}
            />
            {blocks.map((block) => {
              const value = block.settings[ticklist.setting];
              const details = detailsOf(block);
              if (typeof value !== "string" || !value || details.length === 0) return null;
              return (
                <KitGroup key={block.id} title={pickedName(value)}>
                  {drawFields(details, block.settings, block.id)}
                </KitGroup>
              );
            })}
          </div>
        ) : null}

        {/* The things inside this place: the hero's pictures, in order. */}
        {section && blockType && !ticklist ? (
          <div className="flex flex-col gap-2.5">
            {blocks.map((block, index) => (
              <KitPart
                key={block.id}
                title={partWords("Number", { number: index + 1 })}
                summary={summaryOf(block)}
                onUp={index === 0 ? undefined : () => onMoveBlock(block.id, stepTo(index, -1))}
                onDown={index === blocks.length - 1 ? undefined : () => onMoveBlock(block.id, stepTo(index, 1))}
                onRemove={() => onRemoveBlock(block.id)}
                upLabel={tEditor("moveUp", { name: t(slot.label) })}
                downLabel={tEditor("moveDown", { name: t(slot.label) })}
                removeLabel={partWords("Remove", { number: index + 1 })}
              >
                {drawFields(fieldsFor(block), block.settings, block.id)}
              </KitPart>
            ))}
            {/*
              The cap is the theme's and the API enforces it; this says so
              rather than refusing a click with no explanation.
            */}
            <KitAdd
              label={partWords("Add")}
              full={full ? t("partsFull", { max: most }) : undefined}
              onAdd={() => onAddBlock(blockType)}
            />
          </div>
        ) : null}
      </KitPanel>

      <EditorSheet
        open={asked?.kind === "link"}
        title={tEditor("linkTitle")}
        hint={tEditor("linkHint")}
        tall
        onClose={() => setAsked(null)}
      >
        <LinkPicker open={asked?.kind === "link"} pages={LINK_PAGES} value={asked?.value ?? ""} onPick={answer} />
      </EditorSheet>

      <EditorSheet
        open={picking && ticklist?.kind === "product"}
        title={tEditor("productTitle")}
        hint={tEditor("productHint")}
        tall
        onClose={() => setPicking(false)}
      >
        <ProductPicker
          open={picking && ticklist?.kind === "product"}
          value={picked}
          most={typeof most === "number" ? most : picked.length + 1}
          onDone={(values) => onSetBlocks(ticklist!.blockType, ticklist!.setting, values)}
          onClose={() => setPicking(false)}
        />
      </EditorSheet>

      <EditorSheet
        open={picking && ticksFromAList}
        title={tEditor("chooseTitle")}
        hint={tEditor("chooseHint", { max: typeof most === "number" ? most : choices.length })}
        tall
        onClose={() => setPicking(false)}
      >
        <ChoicePicker
          open={picking && ticksFromAList}
          options={choices}
          value={picked}
          most={typeof most === "number" ? most : choices.length}
          onDone={(values) => onSetBlocks(ticklist!.blockType, ticklist!.setting, values)}
          onClose={() => setPicking(false)}
        />
      </EditorSheet>

      <EditorSheet
        open={asked?.kind === "picture"}
        title={tEditor(asked?.kind === "picture" && asked.svg ? "logoPickerTitle" : "pictureTitle")}
        hint={tEditor(asked?.kind === "picture" && asked.svg ? "logoPickerHint" : "pictureHint")}
        tall
        onClose={() => setAsked(null)}
      >
        <PicturePicker
          open={asked?.kind === "picture"}
          used={pictures}
          current={asked?.value ?? ""}
          svg={asked?.kind === "picture" ? asked.svg === true : false}
          onPick={(picture) => {
            // An upload that came back with its address can be drawn at once.
            if (picture.url) onPictureUrl?.(picture.key, picture.url);
            answer(picture.key);
          }}
          onClose={() => setAsked(null)}
        />
      </EditorSheet>
    </>
  );
}
