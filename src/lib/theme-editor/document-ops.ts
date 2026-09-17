import type {
  ThemeBlock,
  ThemeDocument,
  ThemeListSpec,
  ThemeManifest,
  ThemeSection,
} from "./api";
import { MAX_ID_LENGTH } from "./rules";

/*
 * Pure reads and edits of a theme document. Every edit returns new objects and leaves
 * the input untouched, so the reducer can compare and React can re-render cheaply.
 */

/**
 * One section list the editor shows: the header or footer group, or a page template.
 * Spelt like the API's error paths ("templates.home.sections[1].type"), so a refused
 * save can point back at its page.
 */
export type PageKey = "header" | "footer" | `templates.${string}`;

const GROUPS = ["header", "footer"] as const;

function templateName(page: PageKey): string | null {
  return page.startsWith("templates.") ? page.slice("templates.".length) : null;
}

/** The theme's pages in picker order: its templates as the theme lists them, then the two groups. */
export function editorPages(manifest: ThemeManifest): PageKey[] {
  return [
    ...Object.keys(manifest.templates).map((name): PageKey => `templates.${name}`),
    ...GROUPS,
  ];
}

export function isGroupPage(page: PageKey): page is "header" | "footer" {
  return page === "header" || page === "footer";
}

/** What the theme says about a page: its name and the sections it allows. Null for a page it lacks. */
export function pageSpec(manifest: ThemeManifest, page: PageKey): ThemeListSpec | null {
  if (isGroupPage(page)) return manifest.groups[page] ?? null;
  const name = templateName(page);
  return name !== null ? (manifest.templates[name] ?? null) : null;
}

export function pageSections(document: ThemeDocument, page: PageKey): ThemeSection[] {
  if (isGroupPage(page)) return document[page]?.sections ?? [];
  const name = templateName(page);
  return (name !== null && document.templates[name]?.sections) || [];
}

export function withPageSections(
  document: ThemeDocument,
  page: PageKey,
  sections: ThemeSection[],
): ThemeDocument {
  if (isGroupPage(page)) return { ...document, [page]: { ...document[page], sections } };
  const name = templateName(page) as string;
  return {
    ...document,
    templates: { ...document.templates, [name]: { ...document.templates[name], sections } },
  };
}

/** A label in the viewer's language, falling back to English. */
export function localLabel(entry: { label: string; label_bn: string }, locale: string): string {
  return locale === "bn" && entry.label_bn?.trim() ? entry.label_bn : entry.label;
}

/**
 * An id the API accepts (letters, digits, - and _, at most 40) that no entry in `taken`
 * uses: "rich_text" becomes "rich-text", then "rich-text-2", "rich-text-3" and so on.
 */
export function newId(type: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base =
    type
      .replace(/_/g, "-")
      .replace(/[^A-Za-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  const fit = (suffix: string) => `${base.slice(0, MAX_ID_LENGTH - suffix.length)}${suffix}`;
  if (!used.has(fit(""))) return fit("");
  for (let n = 2; ; n += 1) {
    const id = fit(`-${n}`);
    if (!used.has(id)) return id;
  }
}

function defaultSettings(specs: { id: string; default: unknown }[]): Record<string, unknown> {
  return Object.fromEntries(specs.map((spec) => [spec.id, spec.default]));
}

/**
 * A new, shown section of `type` with every setting at its default and the blocks the
 * theme requires, so the API accepts it as it is. `takenIds` are the ids in its list.
 */
export function newSection(
  manifest: ThemeManifest,
  type: string,
  takenIds: Iterable<string>,
): ThemeSection {
  const spec = manifest.sections[type];
  const blocks: ThemeBlock[] = [];
  for (const blockType of spec.required_blocks ?? []) {
    const blockSpec = spec.blocks?.[blockType];
    if (!blockSpec) continue;
    blocks.push({
      id: newId(blockType, blocks.map((b) => b.id)),
      type: blockType,
      settings: defaultSettings(blockSpec.settings),
    });
  }
  return {
    id: newId(type, takenIds),
    type,
    hidden: false,
    settings: defaultSettings(spec.settings),
    blocks,
  };
}

/** `items` with the entry at `from` moved to `to`; the same array when nothing moves. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const target = Math.max(0, Math.min(items.length - 1, to));
  if (from < 0 || from >= items.length || from === target) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}
