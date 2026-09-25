/**
 * Settings > Integrations as the owner chose it on 2026-09-25: a card per
 * service with the Paperbase mark and the service's logo, a switch for the
 * whole service, the connections inside the opened card, and greyed "Coming
 * soon" cards that offer nothing to press.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { describe, expect, test } from "vitest";

import {
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

describe("a service card", () => {
  test("shows the Paperbase mark and the service's own logo", () => {
    const html = render(<ServiceCard service="steadfast" name="Steadfast" status="1 account" tone="on" />);
    expect(html).toContain('src="/favicon-128x128.png"');
    expect(html).toContain('src="/assets/courier-assets/steadfast-logo.png"');
  });

  test("a connected service opens its pop-up, with its switch outside the button", () => {
    const html = render(
      <ServiceCard
        service="facebook"
        name="Meta"
        status="2 pixels · sending events"
        tone="on"
        control={<span data-testid="switch" />}
        onOpen={noop}
      />,
    );
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("aria-expanded");
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*data-testid="switch"/);
    expect(html).toContain('data-testid="switch"');
  });

  test("a card that cannot open is not a button", () => {
    const html = render(<ServiceCard service="facebook" name="Meta" status="Not connected" tone="none" />);
    expect(html).not.toContain("<button");
  });

  test("coming soon: greyed, a badge, nothing to press", () => {
    const html = render(
      <ServiceCard service="pathao" name="Pathao" status="Not available yet" tone="none" comingSoon />,
    );
    expect(html).toContain("Coming soon");
    expect(html).toContain("opacity-60");
    expect(html).not.toContain("<button");
    expect(html).not.toContain('role="switch"');
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
