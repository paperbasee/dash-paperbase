/**
 * The hero, in the editor: pictures a merchant adds, removes and orders.
 *
 * The first wired place with a LIST inside it, and the first where one choice
 * means a different section from another -- pictures or a video. Both are easy
 * to get wrong in the same silent way the announcement bar was: the screen
 * accepts the click, looks right, and writes nothing.
 *
 * Its own manifest rather than the shared fixture: what is being proved here is
 * the behaviour of a section with parts and a cap, and bending the fixture into
 * that shape would change what every other test using it is standing on.
 */
import { describe, expect, test } from "vitest";

import type { ThemeDocument, ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { editorReducer, initEditorState, type EditorState } from "@/lib/theme-editor/editor-reducer";
import type { ThemeEditorState } from "@/lib/theme-editor/api";
import {
  addBlockEdits,
  blockSettingEdits,
  choiceEdits,
  setBlocksEdits,
  moveBlockEdits,
  removeBlockEdits,
  sectionFor,
  sectionOfType,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";

const HERO = wiringFor("home", "hero")!;
const labels = (label: string) => ({ label, label_bn: `${label} (bn)` });

const manifest: ThemeManifest = {
  key: "storefront",
  name: "Storefront",
  name_bn: "স্টোরফ্রন্ট",
  category: null,
  settings: [],
  sections: {
    banner_slider: {
      ...labels("Banners"),
      max_blocks: 5,
      settings: [{ id: "interval", type: "number", ...labels("Seconds"), default: 6 }],
      blocks: {
        slide: {
          ...labels("Picture"),
          settings: [
            { id: "image", type: "image", ...labels("Picture"), default: "" },
            { id: "link", type: "url", ...labels("Link"), default: "" },
            { id: "alt", type: "text", ...labels("Description"), default: "" },
          ],
        },
      },
    },
    video: { ...labels("Video"), premium: true, settings: [] },
    header: { ...labels("Header"), at_most_one: true, required: true, settings: [] },
    footer: { ...labels("Footer"), at_most_one: true, required: true, settings: [] },
  },
  groups: {
    header: { ...labels("Header"), sections: ["header"], default: [] },
    footer: { ...labels("Footer"), sections: ["footer"], default: [] },
  },
  templates: {
    home: { ...labels("Home"), sections: ["banner_slider", "video"], default: [] },
  },
} as unknown as ThemeManifest;

const section = (id: string, type: string, over: Partial<ThemeSection> = {}): ThemeSection => ({
  id,
  type,
  hidden: false,
  settings: {},
  blocks: [],
  ...over,
});

function document(sections: ThemeSection[]): ThemeDocument {
  return {
    theme: "storefront",
    settings: {},
    header: { sections: [section("header", "header")] },
    footer: { sections: [section("footer", "footer")] },
    templates: { home: { sections } },
  } as unknown as ThemeDocument;
}

function editor(sections: ThemeSection[]): EditorState {
  return initEditorState({
    document: document(sections),
    manifest,
    draft_revision: 1,
    has_draft: false,
  } as unknown as ThemeEditorState);
}

const picture = (id: string, image: string) => ({
  id,
  type: "slide",
  settings: { image, link: "", alt: "" },
});

/** Every edit takes the editor's own path, so a test cannot prove a route nobody uses. */
const apply = (state: EditorState, edits: ReturnType<typeof choiceEdits>) =>
  edits.reduce(editorReducer, state);

const choose = (state: EditorState, value: string) =>
  apply(state, choiceEdits(state.document, HERO, value, { page: "home", key: "hero" }));
const addPicture = (state: EditorState) =>
  apply(state, addBlockEdits(state.document, HERO, "slide"));
const removePicture = (state: EditorState, blockId: string) =>
  apply(state, removeBlockEdits(state.document, HERO, blockId));
const movePicture = (state: EditorState, blockId: string, to: number) =>
  apply(state, moveBlockEdits(state.document, HERO, blockId, to));
const setOnPicture = (state: EditorState, blockId: string, setting: string, value: unknown) =>
  apply(state, blockSettingEdits(state.document, HERO, blockId, setting, value));

const pictures = (state: EditorState) =>
  (sectionFor(state.document, HERO)?.blocks ?? []).map((block) => block.settings.image);

describe("the pictures", () => {
  const start = () => editor([section("hero", "banner_slider", { blocks: [picture("p1", "/one.jpg")] })]);

  test("a picture is added to the end", () => {
    const after = addPicture(start());
    expect(pictures(after)).toEqual(["/one.jpg", ""]);
  });

  test("a picture is removed", () => {
    const after = removePicture(start(), "p1");
    expect(pictures(after)).toEqual([]);
  });

  test("a picture moves without dragging", () => {
    const two = editor([
      section("hero", "banner_slider", { blocks: [picture("p1", "/one.jpg"), picture("p2", "/two.jpg")] }),
    ]);
    expect(pictures(movePicture(two, "p2", 0))).toEqual(["/two.jpg", "/one.jpg"]);
  });

  test("what a merchant chooses for one picture reaches that picture", () => {
    const after = setOnPicture(start(), "p1", "alt", "Two people in raincoats");
    expect(sectionFor(after.document, HERO)?.blocks[0].settings.alt).toBe("Two people in raincoats");
  });

  test("the loaded document is never edited in place", () => {
    // The editor hands its document to autosave by identity: an edit made in
    // place would be saved as "no change", and the merchant's picture would sit
    // on the screen and never reach the shop.
    const sections = [section("hero", "banner_slider", { blocks: [picture("p1", "/one.jpg")] })];
    const loaded = document(sections);
    const before = JSON.stringify(loaded);

    const state = initEditorState({
      document: loaded,
      manifest,
      draft_revision: 1,
      has_draft: false,
    } as unknown as ThemeEditorState);
    addPicture(state);

    expect(JSON.stringify(loaded)).toBe(before);
  });
});

describe("pictures or a video", () => {
  const start = () =>
    editor([
      section("hero", "banner_slider", { blocks: [picture("p1", "/one.jpg")] }),
      section("clip", "video", { hidden: true }),
    ]);

  test("the place reads as whatever is showing", () => {
    expect(slotValueFor(start().document, HERO)).toBe("slider");
  });

  test("choosing the video hides the pictures rather than removing them", () => {
    // A merchant who tries the video and goes back must still have the pictures
    // they spent an afternoon choosing.
    const after = choose(start(), "video");

    expect(slotValueFor(after.document, HERO)).toBe("video");
    const hidden = sectionOfType(after.document, HERO, "banner_slider")!;
    expect(hidden.hidden).toBe(true);
    expect(hidden.blocks.map((b) => b.settings.image)).toEqual(["/one.jpg"]);
  });

  test("going back to the pictures finds them where they were", () => {
    const back = choose(choose(start(), "video"), "slider");

    expect(slotValueFor(back.document, HERO)).toBe("slider");
    expect(pictures(back)).toEqual(["/one.jpg"]);
    expect(sectionOfType(back.document, HERO, "video")!.hidden).toBe(true);
  });

  test("a section this document has never carried is added", () => {
    const only = editor([section("hero", "banner_slider", { blocks: [] })]);

    const after = choose(only, "video");

    expect(sectionOfType(after.document, HERO, "video")).not.toBeNull();
    expect(slotValueFor(after.document, HERO)).toBe("video");
  });

  test("a hero with no pictures still reads as the pictures hero", () => {
    // There is no "off" here: an empty hero is one waiting for a picture, and
    // the shop draws nothing for it either way.
    const empty = editor([section("hero", "banner_slider", { blocks: [] })]);
    expect(slotValueFor(empty.document, HERO)).toBe("slider");
  });
});


describe("a band that is ticked rather than filled in", () => {
  /**
   * The featured band's part is ONE choice, so it is picked from a checklist
   * (owner, 2026-09-23) -- eight products used to be eight rounds of
   * open-search-pick-close. One action, so one document reaches autosave rather
   * than eight.
   *
   * Proved on the hero's own manifest with a made-up section, because what is
   * being tested is the reducer's rule, not the featured band's settings.
   */
  const picks = (state: EditorState) =>
    (sectionFor(state.document, HERO)?.blocks ?? []).map((b) => b.settings.image);

  const setAll = (state: EditorState, values: string[]) =>
    apply(state, setBlocksEdits(state.document, HERO, "slide", "image", values));

  const start = () =>
    editor([section("hero", "banner_slider", { blocks: [picture("p1", "/one.jpg")] })]);

  test("every pick lands in one action, in the order given", () => {
    const after = setAll(start(), ["/two.jpg", "/one.jpg", "/three.jpg"]);
    expect(picks(after)).toEqual(["/two.jpg", "/one.jpg", "/three.jpg"]);
  });

  test("a pick that was already there keeps everything else on it", () => {
    const withAlt = apply(
      start(),
      blockSettingEdits(start().document, HERO, "p1", "alt", "Two people in raincoats"),
    );

    const after = setAll(withAlt, ["/one.jpg"]);

    expect(sectionFor(after.document, HERO)?.blocks[0].settings.alt).toBe(
      "Two people in raincoats",
    );
  });

  test("unticking everything empties the band", () => {
    expect(picks(setAll(start(), []))).toEqual([]);
  });

  test("it never takes more than the theme allows", () => {
    const after = setAll(start(), ["/1", "/2", "/3", "/4", "/5", "/6", "/7"]);
    expect(picks(after)).toHaveLength(5);
  });
});
