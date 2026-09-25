/**
 * The shop in the middle of the editor, and the list of places beside it (2026-09-26).
 *
 * The frame itself is the storefront's; what the editor draws is the line above it -- what the
 * pointer is over, whether a click picks or browses -- and the list a merchant reaches the places
 * the page cannot show through.
 */
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { PreviewPane } from "@/components/theme-editor/PreviewPane";
import { PagePlaces } from "@/components/theme-editor/slots/PagePlaces";
import { initPreviewState, type PreviewState } from "@/lib/theme-editor/preview-session";
import en from "../../messages/en.json";

const session = (state: Partial<PreviewState> = {}) =>
  ({
    state: { ...initPreviewState("str_1", "v1"), phase: "shown", hasShown: true, ...state },
    frameRef: createRef<HTMLIFrameElement>(),
    formRef: createRef<HTMLFormElement>(),
    current: () => initPreviewState("str_1", "v1"),
    saved: () => {},
    show: () => {},
    reload: () => {},
    post: () => {},
  }) as unknown as Parameters<typeof PreviewPane>[0]["session"];

const pane = (props: Partial<Parameters<typeof PreviewPane>[0]> = {}) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <PreviewPane
        origin="https://preview.example.test"
        width="390px"
        session={session()}
        note={<span>the note</span>}
        status={null}
        selecting
        onSelecting={() => {}}
        {...props}
      />
    </NextIntlClientProvider>,
  );

describe("the line over the shop", () => {
  test("says what the page is, or what the pointer is over", () => {
    expect(pane()).toContain("the note");
    const hovering = pane({ status: <span>Logo · click to change</span> });
    expect(hovering).toContain("Logo · click to change");
    expect(hovering).not.toContain("the note");
  });

  test("Select and Browse, one of them on", () => {
    const html = pane({ selecting: false });
    expect(html).toContain('role="radiogroup"');
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>)[\s\S])*Browse/);
    expect(html).toMatch(/aria-checked="false"[^>]*>(?:(?!<\/button>)[\s\S])*Select/);
  });

  test("the frame is the preview host's, at the width asked for, and entered by a form post", () => {
    const html = pane();
    expect(html).toContain('action="https://preview.example.test/api/preview/enter"');
    expect(html).toContain("--preview-width:390px");
    expect(html).toContain("<iframe");
  });

  test("while it opens, and when it cannot, it says so over the frame", () => {
    expect(pane({ session: session({ phase: "minting", hasShown: false }) })).toContain(en.themeEditor.previewOpening);
    // The markup escapes an apostrophe, so the words are compared as HTML.
    expect(pane({ session: session({ phase: "unavailable" }) })).toContain(
      en.themeEditor.previewUnavailable.replace(/'/g, "&#x27;"),
    );
  });
});

describe("the list of places", () => {
  const html = renderToStaticMarkup(
    <PagePlaces
      openId="header:logo"
      onOpen={() => {}}
      groups={[
        {
          title: "Header",
          rows: [
            { id: "header:layout", name: "Design", value: "Bar", locked: false },
            { id: "header:logo", name: "Logo", value: "", locked: false },
          ],
        },
        { title: "Checkout", rows: [{ id: "checkout:form", name: "Order form", value: "", locked: true }] },
      ]}
    />,
  );

  test("each place by its name, with what it is set to", () => {
    expect(html).toContain("Design");
    expect(html).toContain("Bar");
    expect(html).toContain('data-place="checkout:form"');
  });

  test("the open one is marked as the current one", () => {
    expect(html).toMatch(/data-place="header:logo" aria-current="true"/);
    expect(html).not.toMatch(/data-place="header:layout" aria-current/);
  });
});
