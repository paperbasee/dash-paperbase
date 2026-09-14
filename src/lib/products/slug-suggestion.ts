import api from "@/lib/api";

export type SlugCheckHttp = Pick<typeof api, "get">;

export type SlugSuggestion = { slug: string; usesFallback: boolean };

type CheckSlugResponse = { available: boolean; suggested_slug?: string };

/**
 * One GET admin/products/check-slug/: the API answers with the first free slug of slug, slug-2,
 * slug-3 ... (the scheme Product.save uses), however many of them are taken.
 */
export async function fetchSlugSuggestion(
  http: SlugCheckHttp,
  baseSlug: string,
  opts: { excludePublicId?: string; signal?: AbortSignal } = {},
): Promise<SlugSuggestion> {
  const params: Record<string, string> = { slug: baseSlug };
  if (opts.excludePublicId) params.exclude_public_id = opts.excludePublicId;
  const { data } = await http.get<CheckSlugResponse>("admin/products/check-slug/", {
    params,
    signal: opts.signal,
  });
  return {
    slug: data.suggested_slug || baseSlug,
    usesFallback: !data.available,
  };
}

/**
 * Check `baseSlug` after `delayMs` of no typing. The returned cancel function (the effect cleanup)
 * stops the timer, aborts a request in flight and silences its result, so an older name can never
 * overwrite the result for a newer one; if that check was running it reports checking=false. On a failed check the typed slug is shown, as before.
 */
export function scheduleSlugSuggestion(opts: {
  http?: SlugCheckHttp;
  baseSlug: string;
  excludePublicId?: string;
  delayMs?: number;
  onChecking: (checking: boolean) => void;
  onResult: (result: SlugSuggestion) => void;
}): () => void {
  const { http = api, baseSlug, excludePublicId, delayMs = 400, onChecking, onResult } = opts;
  const controller = new AbortController();
  let cancelled = false;
  let checking = false;
  const timer = setTimeout(() => {
    checking = true;
    onChecking(true);
    void (async () => {
      let result: SlugSuggestion;
      try {
        result = await fetchSlugSuggestion(http, baseSlug, {
          excludePublicId,
          signal: controller.signal,
        });
      } catch {
        result = { slug: baseSlug, usesFallback: false };
      }
      if (cancelled) return;
      onResult(result);
      checking = false;
      onChecking(false);
    })();
  }, delayMs);
  return () => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(timer);
    controller.abort();
    // A replaced check that was running turns the checking state off, as the old walk did.
    if (checking) {
      checking = false;
      onChecking(false);
    }
  };
}
