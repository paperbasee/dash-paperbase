/**
 * The plan to move every shop address to https (agreed 2026-10-09): a merchant's own domain counts
 * as secure only when its certificate is issued AND a check from outside found https really works
 * for shoppers. These pin the dashboard's half -- the call behind "Check again", what each answer
 * of the outside check means, how one press of the button ends, and what the dashboard keeps.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ default: { post } }));

import { MutationObserver, QueryClient } from "@tanstack/react-query";

import { ApiHttpError, ApiTransportError } from "@/lib/api-client";
import {
  checkHttps,
  domainIsSettling,
  domainSecureState,
  HttpsCheckRefusedError,
  runHttpsCheck,
  withCheckedDomain,
  type StoreDomain,
  type StoreDomainHttpsCheck,
  type StoreDomainSslStatus,
} from "@/lib/domains/api";
import { checkHttpsMutationOptions } from "@/lib/domains/hooks";
import { domainsQueryKey, storeQueryKey } from "@/lib/query-keys";

function domain(overrides: Partial<StoreDomain> = {}): StoreDomain {
  return {
    public_id: "dom_1",
    hostname: "sajwear.com",
    kind: "custom",
    status: "active",
    is_primary: true,
    ssl_status: "issued",
    ssl_checked_at: "2026-10-09T14:00:00Z",
    ssl_expires_at: "2026-12-30T00:00:00Z",
    ssl_error: "",
    verified_at: "2026-10-01T10:00:00Z",
    last_checked_at: "2026-10-09T14:00:00Z",
    check_error: "",
    created_at: "2026-10-01T09:00:00Z",
    removable: true,
    https_check: "ok",
    https_checked_at: "2026-10-09T14:01:00Z",
    ...overrides,
  };
}

const CHECKS: StoreDomainHttpsCheck[] = [
  "",
  "ok",
  "origin_over_http",
  "edge_redirects_to_http",
  "edge_certificate_invalid",
  "wrong_answer",
];
const NOT_ISSUED: StoreDomainSslStatus[] = ["none", "pending", "failed"];

beforeEach(() => {
  post.mockReset();
});

describe("checkHttps: the call behind Check again", () => {
  it("POSTs to the domain's check-https action with no body and answers the checked domain", async () => {
    const checked = domain({ https_check: "origin_over_http" });
    post.mockResolvedValue({ data: checked });
    await expect(checkHttps("dom_1")).resolves.toEqual(checked);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]).toEqual(["settings/network/domains/dom_1/check-https/"]);
  });

  it("a 429 is a typed refusal carrying the API's retry_after, in whole seconds", async () => {
    post.mockRejectedValue(new ApiHttpError("Checked a moment ago.", 429, { detail: "x", retry_after: 17 }));
    const error = await checkHttps("dom_1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpsCheckRefusedError);
    expect(error).toMatchObject({ reason: "too_soon", retryAfter: 17 });

    post.mockRejectedValue(new ApiHttpError("x", 429, { detail: "x", retry_after: 12.2 }));
    await expect(checkHttps("dom_1")).rejects.toMatchObject({ reason: "too_soon", retryAfter: 13 });
  });

  it("a 429 without a usable retry_after waits out the API's whole 30-second window", async () => {
    for (const data of [{ detail: "x" }, { retry_after: "soon" }, { retry_after: 0 }, null]) {
      post.mockRejectedValue(new ApiHttpError("x", 429, data));
      await expect(checkHttps("dom_1")).rejects.toMatchObject({ reason: "too_soon", retryAfter: 30 });
    }
  });

  it("a 400 is a typed refusal: only a live domain of the merchant's own can be checked", async () => {
    post.mockRejectedValue(new ApiHttpError("Only an active custom domain.", 400, { detail: "x" }));
    const error = await checkHttps("dom_1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpsCheckRefusedError);
    expect(error).toMatchObject({ reason: "not_live" });
  });

  it("a 404 is the same refusal: the domain was removed since this page loaded", async () => {
    // The API's own "Domain not found." is English; the merchant reads it in their language.
    post.mockRejectedValue(new ApiHttpError("Domain not found.", 404, { detail: "Domain not found." }));
    const error = await checkHttps("dom_1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpsCheckRefusedError);
    expect(error).toMatchObject({ reason: "not_live" });
  });

  it("no answer at all, and any other failure, reach the caller untouched", async () => {
    const offline = new ApiTransportError("Failed to fetch");
    post.mockRejectedValue(offline);
    await expect(checkHttps("dom_1")).rejects.toBe(offline);

    const broken = new ApiHttpError("HTTP 500", 500, null);
    post.mockRejectedValue(broken);
    await expect(checkHttps("dom_1")).rejects.toBe(broken);
  });
});

describe("domainSecureState: what a shopper meets on the address now", () => {
  it("a merchant's live domain is secure only when the certificate is issued AND the outside check is ok", () => {
    const secure = CHECKS.filter((c) => domainSecureState(domain({ https_check: c })) === "secure");
    expect(secure).toEqual(["ok"]);
  });

  it("an issued certificate names each answer of the outside check", () => {
    const states = Object.fromEntries(
      CHECKS.map((c) => [c || "(empty)", domainSecureState(domain({ https_check: c, https_checked_at: null }))]),
    );
    expect(states).toEqual({
      "(empty)": "checking",
      ok: "secure",
      origin_over_http: "originOverHttp",
      edge_redirects_to_http: "edgeRedirectsToHttp",
      edge_certificate_invalid: "edgeCertificateInvalid",
      wrong_answer: "wrongAnswer",
    });
  });

  it("not checked yet is 'checking'; checked with no answer (timeout, DNS) says so instead", () => {
    expect(domainSecureState(domain({ https_check: "", https_checked_at: null }))).toBe("checking");
    expect(domainSecureState(domain({ https_check: "", https_checked_at: "2026-10-09T14:01:00Z" }))).toBe(
      "noAnswer",
    );
  });

  it("the certificate comes first: until it is issued, the outside check is not the story", () => {
    for (const ssl of NOT_ISSUED) {
      for (const check of CHECKS) {
        expect(domainSecureState(domain({ ssl_status: ssl, https_check: check }))).toBe(
          ssl === "failed" ? "certificateFailed" : "certificatePending",
        );
      }
    }
  });

  it("free addresses keep today's behaviour: no notice, whatever the check holds", () => {
    for (const ssl of [...NOT_ISSUED, "issued"] as StoreDomainSslStatus[]) {
      for (const check of CHECKS) {
        expect(domainSecureState(domain({ kind: "subdomain", ssl_status: ssl, https_check: check }))).toBeNull();
      }
    }
  });

  it("a domain still being connected, or removed, has no notice yet", () => {
    for (const status of ["pending", "verifying", "failed", "disabled"] as const) {
      expect(domainSecureState(domain({ status, https_check: "wrong_answer" }))).toBeNull();
    }
  });
});

describe("domainIsSettling: the list keeps polling while the answer is on its way", () => {
  it("polls while the first outside check has not run, and stops once it has", () => {
    expect(domainIsSettling(domain({ https_check: "", https_checked_at: null }))).toBe(true);
    expect(domainIsSettling(domain({ https_check: "", https_checked_at: "2026-10-09T14:01:00Z" }))).toBe(false);
    for (const check of CHECKS.filter(Boolean)) {
      expect(domainIsSettling(domain({ https_check: check }))).toBe(false);
    }
  });

  it("keeps today's rules for the certificate and for a domain being connected", () => {
    expect(domainIsSettling(domain({ ssl_status: "pending", https_check: "" }))).toBe(true);
    expect(domainIsSettling(domain({ ssl_status: "none", https_check: "" }))).toBe(true);
    expect(domainIsSettling(domain({ ssl_status: "failed", https_check: "" }))).toBe(false);
    expect(domainIsSettling(domain({ status: "verifying" }))).toBe(true);
    expect(domainIsSettling(domain({ kind: "subdomain", ssl_status: "pending", https_check: "" }))).toBe(false);
  });
});

describe("runHttpsCheck: how one press of Check again ends", () => {
  it("success: secure, or checked but not secure yet (the notice says what to change)", async () => {
    await expect(runHttpsCheck(async () => domain())).resolves.toEqual({ kind: "secure" });
    await expect(
      runHttpsCheck(async () => domain({ https_check: "edge_redirects_to_http" })),
    ).resolves.toEqual({ kind: "notSecure" });
    await expect(
      runHttpsCheck(async () => domain({ ssl_status: "pending", https_check: "ok" })),
    ).resolves.toEqual({ kind: "notSecure" });
  });

  it("a check that got no answer from the domain says so, not 'not secure yet'", async () => {
    // The notice beside it then reads "could not reach"; a toast saying "not secure, the note
    // says what to do" would point at a note that names nothing to do.
    await expect(
      runHttpsCheck(async () => domain({ https_check: "", https_checked_at: "2026-10-09T14:05:00Z" })),
    ).resolves.toEqual({ kind: "noAnswer" });
  });

  it("429: too soon, with the seconds to wait", async () => {
    post.mockRejectedValue(new ApiHttpError("x", 429, { detail: "x", retry_after: 24 }));
    await expect(runHttpsCheck(() => checkHttps("dom_1"))).resolves.toEqual({ kind: "tooSoon", seconds: 24 });
  });

  it("400: the domain is not live (any more), so there is nothing to check", async () => {
    post.mockRejectedValue(new ApiHttpError("x", 400, { detail: "x" }));
    await expect(runHttpsCheck(() => checkHttps("dom_1"))).resolves.toEqual({ kind: "notLive" });
  });

  it("no answer from Paperbase: failed, carrying the error the toast explains", async () => {
    const offline = new ApiTransportError("Failed to fetch");
    post.mockRejectedValue(offline);
    await expect(runHttpsCheck(() => checkHttps("dom_1"))).resolves.toEqual({ kind: "failed", error: offline });
  });
});

describe("withCheckedDomain: the answer replaces its own row in the cached list", () => {
  it("replaces only the checked row and keeps the records the answer did not carry", () => {
    const records = [{ type: "TXT", name: "_paperbase.sajwear.com", value: "pb=1", note: "" }];
    const other = domain({ public_id: "dom_2", hostname: "shop.paperbase.me", kind: "subdomain" });
    const rows = [domain({ https_check: "", https_checked_at: null, dns_records: records }), other];
    const checked = domain({ https_check: "wrong_answer" });

    const next = withCheckedDomain(rows, checked);
    expect(next?.[0]).toEqual({ ...checked, dns_records: records });
    expect(next?.[1]).toBe(other);
  });

  it("leaves a list that has not arrived alone", () => {
    expect(withCheckedDomain(undefined, domain())).toBeUndefined();
  });
});

describe("useCheckHttps: what the dashboard keeps after a check", () => {
  const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const press = (client: QueryClient, publicId = "dom_1") =>
    new MutationObserver(client, checkHttpsMutationOptions(client)).mutate(publicId);

  it("an answer is not undone by a list poll that was already on its way", async () => {
    const client = newClient();
    const before = domain({ https_check: "", https_checked_at: null });
    client.setQueryData(domainsQueryKey, [before]);

    // The list polls every 30 seconds while a domain is "checking" -- exactly when a merchant
    // presses Check again. This poll read the row before the check wrote it, and lands after.
    let answerPoll: (rows: StoreDomain[]) => void = () => undefined;
    void client.prefetchQuery({
      queryKey: domainsQueryKey,
      queryFn: () => new Promise<StoreDomain[]>((resolve) => (answerPoll = resolve)),
    });
    await flush();

    post.mockResolvedValue({ data: domain({ https_check: "ok" }) });
    await press(client);
    answerPoll([before]);
    await flush();

    expect(client.getQueryData<StoreDomain[]>(domainsQueryKey)?.[0].https_check).toBe("ok");
  });

  it.each([400, 404])(
    "a %i refusal fetches the list and the store again: the live address may have moved",
    async (status) => {
      const client = newClient();
      client.setQueryData(domainsQueryKey, [domain()]);
      client.setQueryData(storeQueryKey, { public_id: "store_1" });
      post.mockRejectedValue(new ApiHttpError("x", status, { detail: "x" }));

      await press(client).catch(() => undefined);

      expect(client.getQueryState(domainsQueryKey)?.isInvalidated).toBe(true);
      expect(client.getQueryState(storeQueryKey)?.isInvalidated).toBe(true);
    },
  );

  it("a check that ran fetches nothing: the answer goes straight into its row", async () => {
    const client = newClient();
    client.setQueryData(domainsQueryKey, [domain({ https_check: "", https_checked_at: null })]);
    client.setQueryData(storeQueryKey, { public_id: "store_1" });
    post.mockResolvedValue({ data: domain({ https_check: "wrong_answer" }) });

    await press(client);

    expect(client.getQueryData<StoreDomain[]>(domainsQueryKey)?.[0].https_check).toBe("wrong_answer");
    expect(client.getQueryState(domainsQueryKey)?.isInvalidated).toBe(false);
    expect(client.getQueryState(storeQueryKey)?.isInvalidated).toBe(false);
  });
});
