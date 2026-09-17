"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import api from "@/lib/api";
import { apiErrorParts, mintPreviewPass } from "@/lib/theme-editor/api";
import {
  initPreviewState,
  PREVIEW_REFRESH_MESSAGE,
  previewTransition,
  readPreviewMessage,
  type PreviewEffect,
  type PreviewEvent,
  type PreviewMessage,
  type PreviewState,
} from "@/lib/theme-editor/preview-session";

/** The iframe's name: the entry form posts into it. */
export const PREVIEW_FRAME_NAME = "pb-theme-preview";

/**
 * Runs the preview state machine (lib/theme-editor/preview-session) against the real frame:
 * mints passes, posts them into the frame, listens for its messages and keeps the waits.
 *
 * The pass lives in a ref for as long as it is needed and goes only into the hidden form's
 * field for the moment of the post: never into state, a query, a URL, storage or a log.
 */
export function usePreviewSession({
  origin,
  storePublicId,
  savedVersion,
  onMessage,
}: {
  origin: string;
  storePublicId: string;
  savedVersion: string;
  /** Every accepted message, after the state machine has seen it, with the state from before it. */
  onMessage?: (message: PreviewMessage, before: PreviewState) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const passRef = useRef<string | null>(null);
  const stateRef = useRef(initPreviewState(storePublicId, savedVersion));
  const [state, setState] = useState(stateRef.current);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  const dispatchRef = useRef<(event: PreviewEvent) => void>(() => {});

  const run = useCallback(
    (effect: PreviewEffect) => {
      const frame = frameRef.current;
      switch (effect.type) {
        case "mint":
          mintPreviewPass(api).then(
            (pass) => {
              passRef.current = pass.preview_pass;
              dispatchRef.current({ type: "minted", storePublicId: pass.store_public_id });
            },
            (error: unknown) => {
              const { status, code } = apiErrorParts(error);
              if (status === 403) {
                dispatchRef.current({
                  type: "mintRefused",
                  reason: code === "not_entitled" ? "not_entitled" : "not_allowed",
                });
              } else {
                // 429: this member opened more previews in the last hour than the API allows.
                dispatchRef.current({ type: "mintFailed", limited: status === 429 });
              }
            },
          );
          return;
        case "enter": {
          const form = formRef.current;
          const field = form?.elements.namedItem("preview_pass") as HTMLInputElement | null;
          if (!form || !field || !passRef.current) return;
          field.value = passRef.current;
          form.submit();
          field.value = "";
          return;
        }
        case "load":
          // replace(): the editor's own Back button history gets no entry for it.
          frame?.contentWindow?.location.replace(`${origin}${effect.path}`);
          return;
        case "refresh":
          frame?.contentWindow?.postMessage({ type: PREVIEW_REFRESH_MESSAGE }, origin);
          return;
      }
    },
    [origin],
  );

  const dispatch = useCallback(
    (event: PreviewEvent) => {
      const { state: next, effects } = previewTransition(stateRef.current, event);
      stateRef.current = next;
      setState(next);
      for (const effect of effects) run(effect);
    },
    [run],
  );
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  // Open the preview once per editor session (React may run this effect twice in development).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    dispatch({ type: "start" });
  }, [dispatch]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = readPreviewMessage(event, origin, frameRef.current?.contentWindow);
      if (!message) return;
      const before = stateRef.current;
      dispatch({ type: "message", message });
      onMessageRef.current?.(message, before);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [dispatch, origin]);

  const waitId = state.wait?.id;
  useEffect(() => {
    const wait = stateRef.current.wait;
    if (waitId === undefined || !wait) return;
    const timer = setTimeout(() => dispatch({ type: "timeout", id: waitId }), wait.ms);
    return () => clearTimeout(timer);
  }, [waitId, dispatch]);

  useEffect(() => () => {
    passRef.current = null;
  }, []);

  /** The state as of now, already past the message onMessage is called with. */
  const current = useCallback(() => stateRef.current, []);
  const saved = useCallback((version: string) => dispatch({ type: "saved", version }), [dispatch]);
  const show = useCallback((path: string) => dispatch({ type: "show", path }), [dispatch]);
  const reload = useCallback(() => dispatch({ type: "reload" }), [dispatch]);

  return { state, frameRef, formRef, current, saved, show, reload };
}
