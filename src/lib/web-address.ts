import api from "@/lib/api";

/**
 * A product's, category's, brand's or blog post's web address (its slug: `/products/<...>/<address>`,
 * `/categories/...`, `/brands/...`, `/blog/...`), owner 2026-10-04/05: made once from the name -- a
 * Bangla name in English letters, হলুদ সুতি থ্রি-পিস -> holud-suti-thri-pis -- kept when the name
 * changes, changed only by the merchant; an old address keeps forwarding. The API makes every
 * address (api engine.core.addresses); the dashboard only asks it, so the address shown is the
 * address saved.
 */
export type AddressKind = "product" | "category" | "brand" | "post";

export type AddressCheckHttp = Pick<typeof api, "get">;

/**
 * What the API makes of what was typed: `address` (the words, or the name, as an address),
 * whether it is `available`, and `suggested` -- the first free of address, address-2, -3 ...
 */
export type AddressCheck = { address: string; available: boolean; suggested: string };

const CHECK_URL: Record<AddressKind, string> = {
  product: "admin/products/check-slug/",
  category: "admin/categories/check-slug/",
  brand: "admin/brands/check-slug/",
  post: "admin/blogs/check-slug/",
};

type CheckResponse = { available: boolean; suggested_slug?: string; address?: string };

/** What to ask about: the name (a new item's first suggestion) or an address the merchant typed. */
export type AddressQuestion = { name: string } | { address: string };

/** One GET of the kind's check, answered in a constant number of queries. */
export async function checkAddress(
  http: AddressCheckHttp,
  kind: AddressKind,
  question: AddressQuestion,
  opts: { excludePublicId?: string; signal?: AbortSignal } = {},
): Promise<AddressCheck> {
  const params: Record<string, string> =
    "name" in question ? { name: question.name } : { slug: question.address };
  if (opts.excludePublicId) params.exclude_public_id = opts.excludePublicId;
  const { data } = await http.get<CheckResponse>(CHECK_URL[kind], { params, signal: opts.signal });
  const suggested = data.suggested_slug ?? "";
  return { address: data.address ?? suggested, available: data.available, suggested };
}

/**
 * Ask after `delayMs` of no typing. The returned cancel function (an effect's cleanup) stops the
 * timer, aborts a request in flight and silences its answer, so an older question never
 * overwrites the answer to a newer one; a check that was running reports checking=false. A
 * failed check answers null: the field then says nothing it does not know.
 */
export function scheduleAddressCheck(opts: {
  http?: AddressCheckHttp;
  kind: AddressKind;
  question: AddressQuestion;
  excludePublicId?: string;
  delayMs?: number;
  onChecking: (checking: boolean) => void;
  onResult: (check: AddressCheck | null) => void;
}): () => void {
  const { http = api, kind, question, excludePublicId, delayMs = 400, onChecking, onResult } = opts;
  const controller = new AbortController();
  let cancelled = false;
  let checking = false;
  const timer = setTimeout(() => {
    checking = true;
    onChecking(true);
    void (async () => {
      let result: AddressCheck | null;
      try {
        result = await checkAddress(http, kind, question, { excludePublicId, signal: controller.signal });
      } catch {
        result = null;
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
    if (checking) {
      checking = false;
      onChecking(false);
    }
  };
}
