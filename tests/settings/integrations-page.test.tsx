/**
 * Settings > Integrations as the owner chose it on 2026-11-02: a filter column
 * beside a card per service, each with its logo, state, a green seal, one
 * sentence and View details; the whole-service switch and every connection in
 * the pop-up; and "Coming soon" cards that offer nothing to press.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { describe, expect, test } from "vitest";

import { IntegrationFilters } from "@/app/[locale]/(dashboard)/settings/sections/integrations/IntegrationFilters";
import {
  ConnectionList,
  ConnectionMenu,
  ConnectionRow,
  ConnectionSwitch,
  DisconnectedMark,
  ServiceCard,
} from "@/app/[locale]/(dashboard)/settings/sections/integrations/ServiceCard";
import { AD_SERVICES, AD_SERVICES_COMING_SOON, DELIVERY_SERVICES_COMING_SOON } from "@/lib/integrations/services";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

function render(node: React.ReactNode) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>,
  );
}

const noop = () => {};
/** A broken sentence must fail the test, not be logged and replaced by its key. */
const strict = { onError: (error: unknown) => { throw error; } };
const blurb = "Sends your shop's visits and sales to Meta.";

describe("a service card", () => {
  test("shows the service's logo, name and what it does, and no Paperbase mark", () => {
    const html = render(<ServiceCard service="steadfast" name="Steadfast" blurb={blurb} status="1 account" tone="on" />);
    expect(html).toContain('src="/assets/courier-assets/steadfast-logo.png"');
    expect(html).toContain("Steadfast");
    expect(html).toContain(blurb.replace("'", "&#x27;"));
    expect(html).not.toContain("favicon");
  });

  test("a connected service offers View details, with no switch on the card", () => {
    const html = render(
      <ServiceCard service="facebook" name="Meta" blurb={blurb} status="2 pixels · sending events" tone="on" sealed onOpen={noop} />,
    );
    expect(html).toContain("View details");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("Connect");
    expect(html).not.toContain('role="switch"');
  });

  test("the seal is green while a connection runs, and grey once they are all off", () => {
    const on = render(<ServiceCard service="facebook" name="Meta" blurb={blurb} tone="on" sealed onOpen={noop} />);
    const off = render(<ServiceCard service="facebook" name="Meta" blurb={blurb} tone="off" sealed onOpen={noop} />);
    expect(on).toContain("text-green-600");
    expect(off).not.toContain("text-green-600");
    expect(off).toContain("text-muted-foreground/60");
  });

  test("a disconnected service has no seal: nothing on it can run", () => {
    const html = render(<ServiceCard service="facebook" name="Meta" blurb={blurb} tone="off" onOpen={noop} />);
    expect(html).not.toContain("text-green-600");
    expect(html).not.toContain("<svg");
  });

  test("a service with nothing connected offers Connect, for whoever may", () => {
    const html = render(<ServiceCard service="facebook" name="Meta" blurb={blurb} status="Not connected" tone="none" onConnect={noop} />);
    expect(html).toContain("Connect");
    expect(html).not.toContain("View details");
  });

  test("whoever may not connect it has nothing to press", () => {
    const html = render(<ServiceCard service="facebook" name="Meta" blurb={blurb} status="Not connected" tone="none" />);
    expect(html).not.toContain("<button");
  });

  test("coming soon: says so, and offers nothing to press", () => {
    const html = render(<ServiceCard service="pathao" name="Pathao" blurb={blurb} tone="none" comingSoon />);
    expect(html).toContain("Coming soon");
    expect(html).not.toContain("<button");
    expect(html).not.toContain('role="switch"');
  });

  test("a filter hides a card without removing it, so its pop-up survives", () => {
    const html = render(<ServiceCard service="facebook" name="Meta" blurb={blurb} tone="on" onOpen={noop} filteredOut />);
    expect(html).toContain("hidden");
    expect(html).toContain("View details");
  });
});

describe("the filter column", () => {
  const counts = { connected: 3, not_connected: 0, coming_soon: 6 };
  const filters = (extra: Partial<React.ComponentProps<typeof IntegrationFilters>> = {}) =>
    render(
      <IntegrationFilters
        counts={counts}
        standing={null}
        onStanding={noop}
        groups={[]}
        onGroups={noop}
        showGroups
        {...extra}
      />,
    );

  test("names where services stand, with their counts", () => {
    const html = filters();
    for (const word of ["Overview", "Connected", "Not connected", "Coming soon", "Categories", "All", "Ads", "Delivery"]) {
      expect(html, word).toContain(word);
    }
    expect(html).toContain(">3<");
    expect(html).toContain(">6<");
  });

  test("a standing with nothing in it cannot be chosen", () => {
    expect(filters().match(/<button[^>]*disabled=""/g)).toHaveLength(1);
  });

  test("the one chosen reads as pressed, even if it has emptied", () => {
    const html = filters({ standing: "not_connected" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).not.toContain('disabled=""');
  });

  test("no count is drawn until the connections have loaded", () => {
    const html = filters({ counts: null });
    expect(html).not.toContain(">0<");
    expect(html).not.toContain(">6<");
  });

  test("All is ticked until a group is, and never beside one", () => {
    expect(filters().match(/checked=""/g)).toHaveLength(1);
    expect(filters({ groups: ["ads"] }).match(/checked=""/g)).toHaveLength(1);
  });

  test("whoever sees one group has no categories to choose from", () => {
    expect(filters({ showGroups: false })).not.toContain("Categories");
  });
});

describe("the whole-service switch", () => {
  const sections = path.resolve(__dirname, "../../src/app/[locale]/(dashboard)/settings/sections/integrations");

  test.each(["PixelServiceCard.tsx", "SteadfastServiceCard.tsx"])(
    "%s asks on a screen of the pop-up, never in a second pop-up (owner, 2026-09-25)",
    (file) => {
      const source = readFileSync(path.join(sections, file), "utf8");
      expect(source).toContain('kind: "switchAll"');
      expect(source).not.toContain("useConfirm");
    },
  );
});

describe("the pop-up", () => {
  const cardSource = readFileSync(
    path.resolve(__dirname, "../../src/app/[locale]/(dashboard)/settings/sections/integrations/ServiceCard.tsx"),
    "utf8",
  );

  test("is as tall as what it holds: no room kept for rows it does not have (owner, 2026-11-02)", () => {
    expect(render(<ConnectionList>x</ConnectionList>)).not.toContain("min-h");
  });

  test("has no close button to see: pressing outside closes it", () => {
    expect(cardSource).toContain("showCloseButton={false}");
    expect(cardSource).not.toContain("onPointerDownOutside");
    expect(cardSource).not.toContain("onInteractOutside");
  });

  test("a screen reader, which cannot press outside, still has Close", () => {
    expect(cardSource).toContain('<DialogClose className="sr-only">');
  });

  test("on a phone it rises from the bottom, so there is an outside to press", () => {
    expect(cardSource).toContain("max-sm:bottom-0");
    expect(cardSource).toContain("max-h-[86dvh]");
    expect(cardSource).not.toContain("h-dvh");
  });
});

describe("a connection's menu", () => {
  test("is a named ··· button, and nothing at all with nothing to offer", () => {
    expect(render(<ConnectionMenu items={[{ label: "Events", onSelect: noop }]} />)).toContain('aria-label="More"');
    expect(render(<ConnectionMenu items={[]} />)).toBe("");
  });
});

describe("a switch", () => {
  test("off still shows its knob and track, on a dark page too", () => {
    const html = render(<ConnectionSwitch active={false} label="Off" disabled={false} onSwitch={noop} />);
    expect(html).toContain("bg-muted-foreground");
    expect(html).toContain("border-muted-foreground/40");
  });
});

describe("a connection row", () => {
  test("its switch is named and cannot be flipped by someone who only views", () => {
    const html = render(
      <ConnectionRow
        lead={
          <ConnectionSwitch active label="Dataset ID 1234****4821 on or off" disabled onSwitch={noop} />
        }
        title="Dataset ID 1234****4821"
        detail="Connected 12 Sep 2026"
      />,
    );
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Dataset ID 1234****4821 on or off"');
    expect(html).toMatch(/role="switch"[^>]*disabled=""|disabled=""[^>]*role="switch"/);
  });

  test("a disconnected connection has no switch until it is reconnected", () => {
    const html = render(
      <ConnectionRow lead={<DisconnectedMark />} title="Dataset ID 1234****4821" detail="Disconnected · settings kept" detailTone="warning" />,
    );
    expect(html).not.toContain('role="switch"');
    expect(html).toContain("Disconnected · settings kept");
  });
});

describe("the page's words", () => {
  const services = [...AD_SERVICES, ...AD_SERVICES_COMING_SOON, "steadfast", ...DELIVERY_SERVICES_COMING_SOON];

  test.each([
    ["en", en],
    ["bn", bn],
  ] as const)("%s names every service and reads every sentence", (locale, messages) => {
    const t = createTranslator({ locale, messages, namespace: "settings.integrations", ...strict });
    for (const key of services) expect(t(`services.${key}` as never), key).toBeTruthy();
    for (const key of ["overview", "categories", "connected", "statusNotConnected", "comingSoon", "viewDetails"]) {
      expect(t(key as never), key).toBeTruthy();
    }
    expect(t("blurbs.ads", { service: "Meta" })).toContain("Meta");
    expect(t("blurbs.courier", { service: "Pathao" })).toContain("Pathao");
    expect(t("blurbs.google_analytics")).toBeTruthy();
    expect(t("blurbs.steadfast")).toBeTruthy();

    // Every plural and every {service}, formatted for real: an ICU mistake
    // only shows when a merchant turns a switch.
    for (const count of [1, 2, 3]) {
      expect(t("pixelsOn", { count })).toContain(locale === "en" ? String(count) : "");
      t("pixelsOff", { count });
      t("accountsOn", { count });
      t("accountsOff", { count });
      t("offPixels", { count, service: "Meta" });
      t("offAccounts", { count, service: "Steadfast" });
      t("onPixelsTitle", { count, service: "Meta" });
      t("onAccountsTitle", { count, service: "Steadfast" });
      t("someNotChanged", { failed: count, service: "Meta" });
      t("pixelsLeft", { left: count });
    }
    t("pixelsSome", { active: 1, count: 3 });
    for (const count of [1, 2]) {
      t("pixelsDisconnected", { count });
      t("accountsDisconnected", { count });
      t("disconnectedCount", { count });
    }
    for (const key of [
      "back", "reconnect", "remove", "disconnectedKept", "reconnectPixelNote", "reconnectAccountNote",
      "disconnectPixelTitle", "disconnectPixelBody", "disconnectAccountTitle", "disconnectAccountBody",
      "removePixelTitle", "removePixelBody", "removeAccountTitle", "removeAccountBody", "removedTitle",
      "removedBody", "tokenKeep",
    ]) {
      expect(t(key as never), key).toBeTruthy();
    }
    t("reconnectPixelTitle", { service: "Meta" });
    t("reconnectAccountTitle", { service: "Steadfast" });
    t("disconnectedBody", { service: "Meta" });
    t("accountsSome", { active: 1, count: 3 });
    t("pixelsFull", { max: 3 });

    const w = createTranslator({ locale, messages, namespace: "settings.courier.webhook", ...strict });
    for (const key of [
      "title", "hint", "step1Title", "step1Body", "step2Title", "step2Body", "copyUrl", "step3Title",
      "step3Body", "tokenLabel", "reveal", "copyToken", "generate", "regenerate", "save",
      "placeholderStored", "placeholderReplace", "placeholderGenerate", "keepCopy", "storedHidden",
      "step4Title", "step4Body", "regenerateTitle", "regenerateMessage", "regenerateConfirm",
      "copiedTitle", "copiedBody", "copyBlockedTitle", "copyBlockedBody", "savedTitle", "savedBody",
      "saveFailedTitle", "saveFailedBody",
    ]) {
      expect(w(key as never), key).toBeTruthy();
    }
  });

  test("turning a whole service off names how many connections it stops", () => {
    const t = createTranslator({ locale: "en", messages: en, namespace: "settings.integrations", ...strict });
    expect(t("offPixels", { count: 2, service: "Meta" })).toContain("all 2 Meta pixels");
    expect(t("offPixels", { count: 1, service: "Meta" })).toContain("your Meta pixel");
    expect(t("onPixelsTitle", { count: 2, service: "Meta" })).toBe("Turn on all 2 Meta pixels?");
  });
});

describe("the connect forms' placeholders", () => {
  test.each([
    ["en", en],
    ["bn", bn],
  ] as const)("%s: short examples, not sentences", (_locale, messages) => {
    const meta = messages.settings.marketing;
    const tiktok = messages.settings.marketing.tiktok;
    for (const value of [
      meta.pixelPlaceholder,
      meta.accessTokenPlaceholder,
      meta.testEventPlaceholder,
      tiktok.pixelPlaceholder,
      tiktok.accessTokenPlaceholder,
      tiktok.testEventPlaceholder,
    ]) {
      expect(value.length, value).toBeLessThanOrEqual(28);
      expect(value, value).not.toMatch(/^e\.g\./i);
    }
  });
});
