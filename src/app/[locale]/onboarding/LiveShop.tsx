"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { BrowserFrame, type ShopDevice } from "@/components/shop-preview/ShopWindow";
import { PREVIEW_FRAME_NAME, usePreviewSession } from "@/components/theme-editor/usePreviewSession";
import { previewOrigin } from "@/lib/theme-editor/preview-origin";

import { SetupPreview } from "./SetupShell";
import type { SetupState } from "./useSetup";

/** Next inlines a NEXT_PUBLIC_ variable only where it is written out in full. */
const PREVIEW_ORIGIN = previewOrigin(process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW_ORIGIN);

/**
 * The owner's real shop at the end of setup (owner, 2026-09-29: "render the actual website
 * instead of the drawing"): the storefront itself, drawn on the private preview host as the
 * theme editor shows it -- the live shop refuses to be framed (`frame-ancestors 'none'`).
 *
 * With no preview host configured, or before the shop has an id, the drawing stands in: it is
 * the only picture there is.
 */
export function LiveShop({
  setup,
  device,
  onShown,
}: {
  setup: SetupState;
  device: ShopDevice;
  /** Once the shop is on screen: the real one drawn, or the drawing standing in. */
  onShown?: () => void;
}) {
  const framed = Boolean(PREVIEW_ORIGIN && setup.storeId);
  const onShownRef = useRef(onShown);
  useEffect(() => {
    onShownRef.current = onShown;
  });
  useEffect(() => {
    if (!framed) onShownRef.current?.();
  }, [framed]);

  if (!PREVIEW_ORIGIN || !setup.storeId) return <SetupPreview setup={setup} device={device} fill />;
  return (
    <LiveShopFrame
      origin={PREVIEW_ORIGIN}
      storePublicId={setup.storeId}
      hostname={setup.shownHostname}
      device={device}
      onShown={onShown}
    />
  );
}

function LiveShopFrame({
  origin,
  storePublicId,
  hostname,
  device,
  onShown,
}: {
  origin: string;
  storePublicId: string;
  hostname: string;
  device: ShopDevice;
  onShown?: () => void;
}) {
  const t = useTranslations("auth.onboarding");
  // No version to wait for: setup has just published, so the draft the preview draws is the shop.
  const session = usePreviewSession({ origin, storePublicId, savedVersion: "" });
  const { state, frameRef, formRef, reload } = session;
  const { phase } = state;
  const opening = !state.hasShown && (phase === "minting" || phase === "entering" || phase === "loading");
  const failed = phase === "unavailable" || phase === "stopped" || phase === "otherStore";
  const onShownRef = useRef(onShown);
  useEffect(() => {
    onShownRef.current = onShown;
  });
  useEffect(() => {
    if (state.hasShown) onShownRef.current?.();
  }, [state.hasShown]);

  return (
    // One frame whatever the screen: Desktop and Mobile only change its width, since a new frame
    // would need a new pass (as the editor does).
    <BrowserFrame hostname={hostname || "…"} device={device} fill>
      <iframe
        ref={frameRef}
        name={PREVIEW_FRAME_NAME}
        title={t("liveShopTitle")}
        className="absolute inset-0 size-full border-0 bg-white"
      />
      {opening || failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center text-[15px] text-[#475569]">
          {opening ? (
            <p role="status" className="flex items-center gap-2">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              {t("openingShop")}
            </p>
          ) : (
            <>
              <p role="alert" className="text-[#0f172a]">{t("shopDidNotOpen")}</p>
              <button
                type="button"
                onClick={reload}
                className="rounded-[8px] border border-[#e2e2de] px-4 py-2 text-[#0f172a] hover:bg-[#f6f6f4]"
              >
                {t("tryAgain")}
              </button>
            </>
          )}
        </div>
      ) : null}
      {/* The entry form: the pass is put in for the moment of the post, then taken out. */}
      <form ref={formRef} method="post" action={`${origin}/api/preview/enter`} target={PREVIEW_FRAME_NAME} hidden>
        <input type="hidden" name="preview_pass" defaultValue="" />
      </form>
    </BrowserFrame>
  );
}
