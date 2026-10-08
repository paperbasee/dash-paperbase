import api, { currentShop } from "@/lib/api";
import { heldClaims } from "@/lib/accounts/pass";
import { followShopFromMe } from "@/lib/active-shop";
import type { MeForRouting } from "@/lib/subscription-access";

/** Persisted profile cache; stored in localStorage for cross-tab `storage` events. */
export const ME_PROFILE_STORAGE_KEY = "paperbase_me_profile_v8";

export const ME_PROFILE_PERSIST_EVENT = "paperbase-me-profile-persisted";
const ME_PROFILE_CACHE_MAX_AGE_MS = 86_400_000;

type StoredPayload = {
  timestamp?: number;
  profileKey: string;
  me: MeForRouting;
};

let inFlight: Promise<MeForRouting> | null = null;
let inFlightKey: string | null = null;

function dispatchPersisted() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ME_PROFILE_PERSIST_EVENT));
}

/**
 * Whose profile, in which shop: the person the pass names and the shop the dashboard works in
 * (lib/active-shop). Null until this tab holds a pass.
 */
export function currentProfileKey(): string | null {
  const person = heldClaims()?.sub;
  return person ? `${person}\u001e${currentShop() ?? ""}` : null;
}

function isSubscriptionPayloadComplete(me: MeForRouting): boolean {
  const sub = me.subscription;
  if (sub == null || typeof sub !== "object") return true;
  /** Reject legacy/partial caches (e.g. before subscription_status / latest_payment_status) so we refetch auth/me/. */
  return (
    typeof sub.subscription_status === "string" &&
    "latest_payment_status" in me
  );
}

function readStored(profileKey: string): MeForRouting | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ME_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPayload;
    if (
      typeof parsed?.timestamp === "number" &&
      Date.now() - parsed.timestamp > ME_PROFILE_CACHE_MAX_AGE_MS
    ) {
      localStorage.removeItem(ME_PROFILE_STORAGE_KEY);
      return null;
    }
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
      JSON.stringify({ timestamp: Date.now(), profileKey, me } satisfies StoredPayload)
    );
    dispatchPersisted();
  } catch {
    // ignore
  }
}

/** Read persisted `me` for the person and shop of this tab (sync). */
export function getHydratedMeProfile(): MeForRouting | null {
  const profileKey = currentProfileKey();
  return profileKey ? readStored(profileKey) : null;
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
 * Loads profile: a deduped network fetch, kept for the next page load and the other tabs.
 * Does not own React/UI state — caller (AuthContext) applies `me` to context.
 */
export async function ensureMeProfile(): Promise<MeForRouting> {
  const flightKey = currentProfileKey() ?? "__pending__";
  if (inFlight && inFlightKey === flightKey) {
    return inFlight;
  }

  inFlightKey = flightKey;
  inFlight = (async () => {
    try {
      const { data: me } = await api.get<MeForRouting>("auth/me/");
      // The shop /auth/me/ describes is the one the dashboard works in from now on: the one it
      // named, or -- named none, or no longer theirs -- the one to start in.
      const person = heldClaims()?.sub;
      if (person) followShopFromMe(person, me.active_store_public_id ?? null);
      const profileKey = currentProfileKey();
      if (profileKey) writeStored(profileKey, me);
      return me;
    } finally {
      inFlight = null;
      inFlightKey = null;
    }
  })();

  return inFlight;
}
