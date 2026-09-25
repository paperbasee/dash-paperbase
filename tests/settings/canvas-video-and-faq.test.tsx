/**
 * Two drawings the owner found out of step with the shop (2026-09-25): the
 * hero as a video showed the example hero instead of the merchant's cover
 * picture, and the questions sat across the canvas's full width while the
 * shop draws them in a centred column under a centred title.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import { ShopChrome } from "@/components/theme-editor/slots/ShopChrome";
import type { ThemeSection } from "@/lib/theme-editor/api";
import en from "../../messages/en.json";

const section = (type: string, settings: Record<string, unknown>, blocks: ThemeSection["blocks"] = []): ThemeSection => ({
  id: type,
  type,
  hidden: false,
  settings,
  blocks,
});

function draw(page: "home" | "product", slotKey: string, variant: string, live?: ThemeSection) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      <ShopChrome
        page={page}
        slotKey={slotKey}
        variant={variant}
        settings={{}}
        live={live}
        pictureUrl={(key) => `https://media.example.com/${key}`}
      />
    </NextIntlClientProvider>,
  );
}

describe("the hero as a video", () => {
  test("draws the merchant's cover picture with the shop's play mark", () => {
    const html = draw("home", "hero", "video", section("video", { poster: "tenants/s/themes/cover.jpg", ratio: "landscape" }));
    expect(html).toContain('src="https://media.example.com/tenants/s/themes/cover.jpg"');
    expect(html).toContain("data-video-cover");
    expect(html).toContain("aspect-[16/9]");
    expect(html).not.toContain(en.themeEditor.slots.heroHeadingExample);
  });

  test("a tall video is drawn tall", () => {
    const html = draw("home", "hero", "video", section("video", { poster: "", ratio: "portrait" }));
    expect(html).toContain("aspect-[9/16]");
  });
});

describe("the questions", () => {
  test("on the home page, a centred column under a centred title", () => {
    const live = section("faq", { heading: "Questions" }, [
      { id: "q1", type: "question", settings: { question: "Do you deliver outside Dhaka?", answer: "Yes." } },
    ]);
    const html = draw("home", "faq", "on", live);
    expect(html).toContain("mx-auto w-full max-w-[65%]");
    expect(html).toMatch(/items-center[^"]*text-center/);
  });

  test("on the product page, the same", () => {
    const html = draw("product", "faq", "on");
    expect(html).toContain("mx-auto w-full max-w-[65%]");
    expect(html).toMatch(/items-center[^"]*text-center/);
  });
});
