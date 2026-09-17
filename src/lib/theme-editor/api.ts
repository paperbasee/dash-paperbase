/**
 * The theme editor's API (api-paperbase engine/apps/theming/editor_views.py), under
 * /api/v1/theming/. Field names stay in the API's snake_case.
 *
 * Pure: every fetcher takes the HTTP client, the dashboard's `api` in the app and a
 * fake in tests, so this file never touches the browser.
 */

export type ThemeHttp = {
  get<T>(path: string): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown): Promise<{ data: T }>;
};

export type ThemeAccessState = "ok" | "not_entitled" | "storefront_unavailable";

export type ThemeAccess = {
  state: ThemeAccessState;
  /** Why a Premium shop is locked; null unless state is storefront_unavailable. */
  reason: "payment_pending" | "expired" | null;
  /** Holds theming.manage: the owner, Admin, or a store-wide Manager. */
  can_edit: boolean;
};

export type ThemeCurrent = {
  /** What shoppers see now: Basic for a shop that lost Premium. */
  live_theme: string;
  /** The shop's saved theme, kept while it is locked. */
  theme_key: string;
  has_draft: boolean;
  draft_theme: string | null;
  /** Sent back as expected_draft_revision, so a draft changed elsewhere is a 409. */
  draft_revision: number;
  published_at: string | null;
  published_by_name: string;
};

export type ThemeSummary = {
  key: string;
  name: string;
  name_bn: string;
  /** An industry word such as "fashion"; null for Basic. */
  category: string | null;
};

export type ThemeLibrary = {
  manifest_version: string;
  access: ThemeAccess;
  current: ThemeCurrent;
  /** Basic first, then the rest in the API's order. */
  themes: ThemeSummary[];
};

/** What editor/select/ and editor/discard/ answer; the editor (step 3) reads the rest. */
export type ThemeEditorState = {
  theme_key: string;
  has_draft: boolean;
  draft_revision: number;
  revision: number;
  published_at: string | null;
  published_by_name: string;
  manifest_version: string;
  preview_version: string;
  document: unknown;
  manifest: unknown;
};

const BASE = "theming/";

export async function fetchThemeLibrary(http: ThemeHttp): Promise<ThemeLibrary> {
  const { data } = await http.get<ThemeLibrary>(`${BASE}themes/`);
  return data;
}

/** Start a draft from a theme's defaults. The live shop changes only on publish. */
export async function selectTheme(
  http: ThemeHttp,
  themeKey: string,
  expectedDraftRevision: number,
): Promise<ThemeEditorState> {
  const { data } = await http.post<ThemeEditorState>(`${BASE}editor/select/`, {
    theme_key: themeKey,
    expected_draft_revision: expectedDraftRevision,
  });
  return data;
}

export async function discardThemeDraft(
  http: ThemeHttp,
  expectedDraftRevision: number,
): Promise<ThemeEditorState> {
  const { data } = await http.post<ThemeEditorState>(`${BASE}editor/discard/`, {
    expected_draft_revision: expectedDraftRevision,
  });
  return data;
}

/** Keys under settings.customization for what a failed theme action tells the merchant. */
export type ThemeErrorMessageKey =
  | "errorDraftConflict"
  | "errorNoPermission"
  | "errorUnknownTheme"
  | "errorGeneric"
  | "lockNotEntitledTitle"
  | "lockPaymentPending"
  | "lockExpired";

/** Reads the status and body the dashboard's ApiHttpError carries, without importing it. */
export function themeErrorMessageKey(error: unknown): ThemeErrorMessageKey {
  const status = (error as { status?: unknown } | null)?.status;
  const data = (error as { data?: unknown } | null)?.data;
  const body = data && typeof data === "object" ? (data as { code?: unknown; reason?: unknown }) : {};
  if (status === 409 && body.code === "draft_conflict") return "errorDraftConflict";
  if (status === 403) {
    if (body.code === "not_entitled") return "lockNotEntitledTitle";
    if (body.code === "storefront_unavailable") {
      return body.reason === "payment_pending" ? "lockPaymentPending" : "lockExpired";
    }
    return "errorNoPermission";
  }
  if (status === 400 && body.code === "unknown_theme") return "errorUnknownTheme";
  return "errorGeneric";
}
