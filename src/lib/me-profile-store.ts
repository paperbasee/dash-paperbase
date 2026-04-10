import api, {
  getActiveStorePublicIdFromJwt,
  refreshAccessTokenOrThrow,
} from "@/lib/api";
import type { MeForRouting } from "@/lib/subscription-access";

/** Persisted profile cache; stored in localStorage for cross-tab `storage` events. */
export const ME_PROFILE_STORAGE_KEY = "paperbase_me_profile_v4";

export const ME_PROFILE_PERSIST_EVENT = "paperbase-me-profile-persisted";

type StoredPayload = {
  profileKey: string;
  me: MeForRouting;
};

let inFlight: Promise<MeForRouting> | null = null;
let inFlightKey: string | null = null;

function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function dispatchPersisted() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ME_PROFILE_PERSIST_EVENT));
}

/**
 * Stable identity: JWT user_public_id + active_store_public_id (not the raw access token).
 */
export function getMeProfileKeyFromToken(accessToken: string): string | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const data = JSON.parse(atob(padded)) as {
      user_public_id?: unknown;
      active_store_public_id?: unknown;
    };
    const user =
      typeof data.user_public_id === "string" && data.user_public_id.trim()
        ? data.user_public_id.trim()
        : null;
    if (!user) return null;
    const store =
      typeof data.active_store_public_id === "string" &&
      data.active_store_public_id.trim()
        ? data.active_store_public_id.trim()
        : "";
    return `${user}\u001e${store}`;
  } catch {
    return null;
  }
}

function isSubscriptionPayloadComplete(me: MeForRouting): boolean {
  const sub = me.subscription;
  if (sub == null || typeof sub !== "object") return true;
  /** Reject legacy/partial caches (e.g. before subscription_status) so we refetch auth/me/. */
  return typeof sub.subscription_status === "string";
}

function readStored(profileKey: string): MeForRouting | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ME_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (
      parsed &&
      parsed.profileKey === profileKey &&
      parsed.me &&
      typeof parsed.me === "object"
    ) {
      if (!isSubscriptionPayloadComplete(parsed.me)) {
        return null;
      }
      return parsed.me;
    }
  } catch {
    // ignore
  }
  return null;
}

function writeStored(profileKey: string, me: MeForRouting) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ME_PROFILE_STORAGE_KEY,
      JSON.stringify({ profileKey, me } satisfies StoredPayload)
    );
    dispatchPersisted();
  } catch {
    // ignore
  }
}

function normalizeStorePublicId(
  value: string | null | undefined
): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length ? s : null;
}

function resolveProfileKeyAfterFetch(me: MeForRouting, token: string): string | null {
  const fromJwt = getMeProfileKeyFromToken(token);
  if (fromJwt) return fromJwt;
  const uid =
    typeof me.public_id === "string" && me.public_id.trim()
      ? me.public_id.trim()
      : null;
  if (!uid) return null;
  const sid =
    typeof me.active_store_public_id === "string"
      ? me.active_store_public_id.trim()
      : "";
  return `${uid}\u001e${sid}`;
}

/** Read persisted `me` for the current access token (sync). */
export function getHydratedMeProfile(): MeForRouting | null {
  const token = readAccessToken();
  if (!token) return null;
  const profileKey = getMeProfileKeyFromToken(token);
  if (!profileKey) return null;
  return readStored(profileKey);
}

export function clearMeProfileCache(): void {
  inFlight = null;
  inFlightKey = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(ME_PROFILE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Loads profile: optional cache hit, deduped network fetch, persistence only.
 * Does not own React/UI state — caller (AuthContext) applies `me` to context.
 */
export async function ensureMeProfile(options?: {
  forceNetwork?: boolean;
}): Promise<MeForRouting> {
  const token = readAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const profileKey = getMeProfileKeyFromToken(token);

  const flightKey = profileKey ?? "__pending__";
  if (inFlight && inFlightKey === flightKey) {
    return inFlight;
  }

  inFlightKey = flightKey;
  inFlight = (async () => {
    try {
      const { data } = await api.get<MeForRouting>("auth/me/");
      let me = data;
      let tokenAfter = readAccessToken() ?? token;
      if (
        normalizeStorePublicId(getActiveStorePublicIdFromJwt(tokenAfter)) !==
        normalizeStorePublicId(me.active_store_public_id ?? null)
      ) {
        await refreshAccessTokenOrThrow();
        tokenAfter = readAccessToken() ?? token;
        const { data: synced } = await api.get<MeForRouting>("auth/me/");
        me = synced;
      }
      const resolvedKey = resolveProfileKeyAfterFetch(me, readAccessToken() ?? tokenAfter);
      if (resolvedKey) {
        writeStored(resolvedKey, me);
      }
      return me;
    } finally {
      inFlight = null;
      inFlightKey = null;
    }
  })();

  return inFlight;
}
