/**
 * The theme editor's API (api-paperbase engine/apps/theming/editor_views.py), under
 * /api/v1/theming/. Field names stay in the API's snake_case.
 *
 * Pure: every fetcher takes the HTTP client, the dashboard's `api` in the app and a
 * fake in tests, so this file never touches the browser.
 */

/** The dashboard client's own option: a call with no answer by then fails like a lost connection. */
export type ThemeRequestConfig = { timeout?: number };

export type ThemeHttp = {
  get<T>(path: string, config?: ThemeRequestConfig): Promise<{ data: T }>;
  post<T>(path: string, body?: unknown, config?: ThemeRequestConfig): Promise<{ data: T }>;
};

/** One saved version a merchant can bring back (GET editor/versions/), newest first. */
export type ThemeVersion = {
  revision: number;
  theme_key: string;
  published_at: string;
  published_by_name: string;
  /** This is the version shoppers see now. */
  is_live: boolean;
};

/** What editor/publish/ answers. */
export type ThemePublished = {
  revision: number;
  published_at: string;
  /** The draft is gone, and this is where its revision counter stands. */
  draft_revision: number;
  preview_version: string;
};

/**
 * How long the editor's background calls (autosave, preview passes, the example pages) wait for
 * an answer. The client has no timeout of its own, and a stalled connection would otherwise
 * leave autosave on "Saving…" and the preview opening for good.
 */
export const EDITOR_REQUEST_TIMEOUT_MS = 15_000;

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
  /**
   * Themes this shop has already worked on. Opening one of these gives the merchant
   * back what they had; every other theme starts from its defaults.
   */
  started_themes: string[];
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

/**
 * One setting a theme offers, as the theme file writes it. `type` is one of the kinds
 * engine/apps/theming/manifest.py allows (text, textarea, boolean, number, select, url);
 * the fields below it belong to some of those kinds only, and the manifest check makes
 * sure each kind carries the ones it needs.
 */
export type ThemeSettingSpec = {
  id: string;
  type: string;
  label: string;
  label_bn: string;
  default: unknown;
  /** One line under the field. Written in both languages or in neither. */
  help?: string;
  help_bn?: string;
  /** select: the values the API accepts, and a name for each in both languages. */
  options?: string[];
  option_labels?: Record<string, { en: string; bn: string }>;
  /** number: the range the API accepts, ends included. */
  min?: number;
  max?: number;
};

export type ThemeBlockSpec = {
  label: string;
  label_bn: string;
  settings: ThemeSettingSpec[];
};

export type ThemeSectionSpec = {
  label: string;
  label_bn: string;
  settings: ThemeSettingSpec[];
  /** One shown copy per list at most; a hidden copy does not count. */
  at_most_one?: boolean;
  /** Every list that allows it keeps one shown copy, so it is never hidden or removed. */
  required?: boolean;
  /** Blocks every copy of the section keeps. */
  required_blocks?: string[];
  blocks?: Record<string, ThemeBlockSpec>;
};

/** The header or footer group, or a page template: its name and the sections it allows. */
export type ThemeListSpec = {
  label: string;
  label_bn: string;
  sections: string[];
};

/** A theme file (api-paperbase engine/apps/theming/themes/<key>.json). */
export type ThemeManifest = {
  key: string;
  name: string;
  name_bn: string;
  category: string | null;
  settings: ThemeSettingSpec[];
  sections: Record<string, ThemeSectionSpec>;
  groups: { header: ThemeListSpec; footer: ThemeListSpec };
  templates: Record<string, ThemeListSpec>;
};

export type ThemeBlock = {
  id: string;
  type: string;
  settings: Record<string, unknown>;
};

export type ThemeSection = {
  id: string;
  type: string;
  hidden: boolean;
  settings: Record<string, unknown>;
  blocks: ThemeBlock[];
};

export type ThemeSectionList = { sections: ThemeSection[] };

/** A shop's theme document (engine/apps/theming/documents.py): list order is page order. */
export type ThemeDocument = {
  theme: string;
  settings: Record<string, unknown>;
  header: ThemeSectionList;
  footer: ThemeSectionList;
  templates: Record<string, ThemeSectionList>;
};

/** What editor/, editor/select/ and editor/discard/ answer. */
export type ThemeEditorState = {
  theme_key: string;
  /** Whether the theme being edited is the one shoppers see. */
  is_live: boolean;
  has_draft: boolean;
  /** Every counter below describes THIS theme, not the shop. */
  draft_revision: number;
  revision: number;
  published_at: string | null;
  published_by_name: string;
  manifest_version: string;
  preview_version: string;
  /** The draft, else the saved document, else the theme's defaults. */
  document: ThemeDocument;
  manifest: ThemeManifest;
};

const BASE = "theming/";

export async function fetchThemeLibrary(http: ThemeHttp): Promise<ThemeLibrary> {
  const { data } = await http.get<ThemeLibrary>(`${BASE}themes/`);
  return data;
}

/** Everything the editor opens with. Needs theming.manage and an unlocked shop (403 otherwise). */
export async function fetchThemeEditor(http: ThemeHttp): Promise<ThemeEditorState> {
  const { data } = await http.get<ThemeEditorState>(`${BASE}editor/`);
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

/**
 * Put the draft on the shop. The API is the one that clears the storefront's caches and tells
 * it to rebuild, so nothing here purges anything. Throttled to 60 an hour per member per shop.
 */
export async function publishThemeDraft(
  http: ThemeHttp,
  expectedDraftRevision: number,
): Promise<ThemePublished> {
  const { data } = await http.post<ThemePublished>(`${BASE}editor/publish/`, {
    expected_draft_revision: expectedDraftRevision,
  });
  return data;
}

/** The versions this shop can bring back: at most the last 20 saves, newest first. */
export async function fetchThemeVersions(http: ThemeHttp): Promise<ThemeVersion[]> {
  const { data } = await http.get<ThemeVersion[]>(`${BASE}editor/versions/`);
  return data;
}

/** Load a saved version into the draft. It goes live only when the merchant saves. */
export async function restoreThemeVersion(
  http: ThemeHttp,
  revision: number,
  expectedDraftRevision: number,
): Promise<ThemeEditorState> {
  const { data } = await http.post<ThemeEditorState>(`${BASE}editor/versions/${revision}/restore/`, {
    expected_draft_revision: expectedDraftRevision,
  });
  return data;
}

export type ThemeDraftHttp = {
  put<T>(path: string, body?: unknown, config?: ThemeRequestConfig): Promise<{ data: T }>;
};

export type ThemeDraftSaved = {
  /** Sent with the next save. */
  draft_revision: number;
  /** What the preview reports once it has drawn this draft. */
  preview_version: string;
};

/** Save the private draft. The live shop changes only on publish. */
export async function saveThemeDraft(
  http: ThemeDraftHttp,
  document: ThemeDocument,
  expectedDraftRevision: number,
): Promise<ThemeDraftSaved> {
  const { data } = await http.put<ThemeDraftSaved>(
    `${BASE}editor/draft/`,
    { document, expected_draft_revision: expectedDraftRevision },
    { timeout: EDITOR_REQUEST_TIMEOUT_MS },
  );
  return data;
}

export type PreviewPass = {
  /** Secret for two hours: only ever posted into the preview frame, never kept or logged. */
  preview_pass: string;
  expires_at: string;
  store_public_id: string;
};

export async function mintPreviewPass(http: ThemeHttp): Promise<PreviewPass> {
  const { data } = await http.post<PreviewPass>(`${BASE}preview/pass/`, undefined, {
    timeout: EDITOR_REQUEST_TIMEOUT_MS,
  });
  return data;
}

/**
 * The status and the `code`, `path` and `draft_revision` fields of a failed call, read from the
 * dashboard's ApiHttpError.
 */
export function apiErrorParts(error: unknown): {
  status?: number;
  code?: string;
  path?: string;
  /** Where the draft stands now; a 409 carries it, so this editor can save over it. */
  draftRevision?: number;
} {
  const status = (error as { status?: unknown } | null)?.status;
  const data = (error as { data?: unknown } | null)?.data;
  const body =
    data && typeof data === "object"
      ? (data as { code?: unknown; path?: unknown; draft_revision?: unknown })
      : {};
  return {
    status: typeof status === "number" ? status : undefined,
    code: typeof body.code === "string" ? body.code : undefined,
    path: typeof body.path === "string" ? body.path : undefined,
    draftRevision: typeof body.draft_revision === "number" ? body.draft_revision : undefined,
  };
}

/** Keys under settings.customization for what a failed theme action tells the merchant. */
export type ThemeErrorMessageKey =
  | "errorDraftConflict"
  | "errorNoPermission"
  | "errorUnknownTheme"
  | "errorNothingToSave"
  | "errorInvalidDocument"
  | "errorVersionGone"
  | "errorTooManySaves"
  | "errorGeneric"
  | "lockNotEntitledBody"
  | "lockPaymentPending"
  | "lockExpired";

/** Reads the status and body the dashboard's ApiHttpError carries, without importing it. */
export function themeErrorMessageKey(error: unknown): ThemeErrorMessageKey {
  const status = (error as { status?: unknown } | null)?.status;
  const data = (error as { data?: unknown } | null)?.data;
  const body = data && typeof data === "object" ? (data as { code?: unknown; reason?: unknown }) : {};
  if (status === 409 && body.code === "draft_conflict") return "errorDraftConflict";
  if (status === 403) {
    // The body, not the heading: "Themes are part of Premium" alone reads as a title and
    // says nothing about what to do next.
    if (body.code === "not_entitled") return "lockNotEntitledBody";
    if (body.code === "storefront_unavailable") {
      return body.reason === "payment_pending" ? "lockPaymentPending" : "lockExpired";
    }
    return "errorNoPermission";
  }
  if (status === 400) {
    if (body.code === "unknown_theme") return "errorUnknownTheme";
    if (body.code === "nothing_to_publish") return "errorNothingToSave";
    // Publish and restore validate the draft again, because a theme file can have changed
    // under it. Nothing comes right by waiting, so this says what the way out is instead.
    if (body.code === "invalid_document") return "errorInvalidDocument";
  }
  if (status === 404 && body.code === "version_not_found") return "errorVersionGone";
  // The API allows 60 saves an hour per member per shop, and each one rebuilds the whole shop.
  if (status === 429) return "errorTooManySaves";
  return "errorGeneric";
}
