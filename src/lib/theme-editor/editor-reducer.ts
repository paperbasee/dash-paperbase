import type { ThemeBlock, ThemeDocument, ThemeManifest, ThemeSection } from "./api";
import {
  editorPages,
  moveItem,
  newBlock,
  newSection,
  pageSections,
  pageSpec,
  withPageSections,
  withSetting,
  type PageKey,
} from "./document-ops";
import { blockFields, sectionFields, type FieldSpec } from "./field-specs";
import {
  cannotAdd,
  cannotAddBlock,
  cannotHide,
  cannotRemove,
  cannotRemoveBlock,
  cannotShow,
} from "./rules";
import { checkField } from "./validate";

/*
 * The editor's state. It is filled from GET theming/editor/ once, and again only on an
 * explicit reload: a background refetch must never replace a merchant's edits.
 *
 * An edit the rules refuse returns the state unchanged (the same object). The screen
 * never offers one, so this is the backstop that keeps a refused document from ever
 * reaching the API.
 */

export type EditorState = {
  manifest: ThemeManifest;
  /** The document as the server last had it; "changed" compares against it. */
  saved: ThemeDocument;
  document: ThemeDocument;
  page: PageKey;
  /** The document differs from the saved one: leaving would lose edits. */
  changed: boolean;
};

export type EditorAction =
  | { type: "load"; document: ThemeDocument; manifest: ThemeManifest }
  /** Edits kept on this device, brought back on top of the loaded document. */
  | { type: "restore"; document: ThemeDocument }
  | { type: "pickPage"; page: PageKey }
  | { type: "add"; sectionType: string }
  | { type: "hide"; id: string }
  | { type: "show"; id: string }
  | { type: "remove"; id: string }
  /** One setting of a section, or of one of its blocks when `blockId` is given. */
  | { type: "setSetting"; id: string; blockId?: string; setting: string; value: unknown }
  | { type: "addBlock"; id: string; blockType: string }
  | { type: "removeBlock"; id: string; blockId: string }
  | { type: "moveBlock"; id: string; blockId: string; to: number };

const FIRST_PAGE: PageKey = "templates.home";

function samePage(manifest: ThemeManifest, page: PageKey | undefined): PageKey {
  const pages = editorPages(manifest);
  if (page && pages.includes(page)) return page;
  return pages.includes(FIRST_PAGE) ? FIRST_PAGE : pages[0];
}

export function initEditorState(
  loaded: { document: ThemeDocument; manifest: ThemeManifest },
  page?: PageKey,
): EditorState {
  return {
    manifest: loaded.manifest,
    saved: loaded.document,
    document: loaded.document,
    page: samePage(loaded.manifest, page),
    changed: false,
  };
}

function withDocument(state: EditorState, document: ThemeDocument): EditorState {
  if (document === state.document) return state;
  return {
    ...state,
    document,
    changed: JSON.stringify(document) !== JSON.stringify(state.saved),
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "load") return initEditorState(action, state.page);
  if (action.type === "restore") return withDocument(state, action.document);
  if (action.type === "pickPage") {
    if (action.page === state.page || !editorPages(state.manifest).includes(action.page)) return state;
    return { ...state, page: action.page };
  }

  const { manifest, document, page } = state;
  const sections = pageSections(document, page);
  const edit = (next: typeof sections) =>
    withDocument(state, next === sections ? document : withPageSections(document, page, next));

  if (action.type === "add") {
    const allowed = pageSpec(manifest, page)?.sections ?? [];
    if (cannotAdd(manifest, allowed, sections, action.sectionType)) return state;
    const section = newSection(manifest, action.sectionType, sections.map((s) => s.id));
    return edit([...sections, section]);
  }

  const index = sections.findIndex((s) => s.id === action.id);
  if (index < 0) return state;
  const section = sections[index];
  const withSection = (next: ThemeSection) =>
    next === section ? state : edit(sections.map((s, i) => (i === index ? next : s)));

  switch (action.type) {
    case "hide":
    case "show": {
      const hidden = action.type === "hide";
      if (section.hidden === hidden) return state;
      const refused = hidden
        ? cannotHide(manifest, sections, section)
        : cannotShow(manifest, sections, section);
      if (refused) return state;
      return edit(sections.map((s, i) => (i === index ? { ...s, hidden } : s)));
    }
    case "remove":
      if (cannotRemove(manifest, sections, section)) return state;
      return edit(sections.filter((_, i) => i !== index));

    case "setSetting": {
      if (action.blockId === undefined) {
        const spec = fieldFor(sectionFields(manifest, section.type, LABELS_UNUSED), action.setting);
        if (!spec || checkField(spec, action.value)) return state;
        return withSection(withSetting(section, action.setting, action.value));
      }
      const block = section.blocks.find((b) => b.id === action.blockId);
      if (!block) return state;
      const spec = fieldFor(
        blockFields(manifest, section.type, block.type, LABELS_UNUSED),
        action.setting,
      );
      if (!spec || checkField(spec, action.value)) return state;
      return withSection(withBlocks(section, (b) => (b === block ? withSetting(b, action.setting, action.value) : b)));
    }
    case "addBlock": {
      if (cannotAddBlock(manifest, section, action.blockType)) return state;
      const block = newBlock(manifest, section.type, action.blockType, section.blocks.map((b) => b.id));
      if (!block) return state;
      return withSection({ ...section, blocks: [...section.blocks, block] });
    }
    case "removeBlock": {
      const block = section.blocks.find((b) => b.id === action.blockId);
      if (!block || cannotRemoveBlock(manifest, section, block)) return state;
      return withSection({ ...section, blocks: section.blocks.filter((b) => b !== block) });
    }
    case "moveBlock": {
      const from = section.blocks.findIndex((b) => b.id === action.blockId);
      if (from < 0) return state;
      const blocks = moveItem(section.blocks, from, action.to);
      return withSection(blocks === section.blocks ? section : { ...section, blocks });
    }
  }
}

/**
 * The language a field's name is written in does not change what the API stores, and the
 * reducer only checks values, so it reads the fields in whichever language costs nothing.
 */
const LABELS_UNUSED = "en";

function fieldFor(specs: FieldSpec[], setting: string): FieldSpec | undefined {
  return specs.find((spec) => spec.id === setting);
}

function withBlocks(section: ThemeSection, map: (block: ThemeBlock) => ThemeBlock): ThemeSection {
  const blocks = section.blocks.map(map);
  return blocks.every((block, i) => block === section.blocks[i]) ? section : { ...section, blocks };
}
