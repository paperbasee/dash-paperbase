/**
 * The shop owner's powers -- the mirror of the API's list (api-paperbase
 * engine/apps/rbac/owner_powers.py; owner, 2026-10-02; guidelines/roles-plan.md): the shop's
 * money and who gets in. They are not permissions: no role holds them, so they are hidden from
 * every team member, Admin included, and the API refuses them too.
 *
 * - The owner sees them all. Paperbase support, signed in as the owner, sees them to read (the
 *   API refuses any change), except the sessions, which are hidden from support altogether.
 * - A platform superuser sees them, except the sessions.
 *
 * `security` is the dashboard's own: a page that explains sign-in, with nothing behind it to
 * refuse.
 */

export const OWNER_POWERS = [
  "domains",
  "couriers",
  "payments",
  "billing",
  "team",
  "sessions",
  "security",
  "autopilot",
  "owner_details",
] as const;

export type OwnerPower = (typeof OWNER_POWERS)[number];

/** Powers for the owner in person: not a superuser's, and not Paperbase support's. */
const OWNER_IN_PERSON: ReadonlySet<OwnerPower> = new Set<OwnerPower>(["sessions"]);

export type OwnerPowerAccess = {
  isOwner: boolean;
  isSuperuser: boolean;
  /** Paperbase support is in the dashboard ("Sign in as this shop"), signed in as the owner. */
  inSupportMode?: boolean;
  /** Who this is isn't known yet: nothing is hidden meanwhile (the API decides anyway). */
  isUnknown?: boolean;
};

/** Whether this person sees and uses `power`. */
export function holdsOwnerPower(power: OwnerPower, access: OwnerPowerAccess): boolean {
  if (access.isUnknown) return true;
  if (OWNER_IN_PERSON.has(power)) return access.isOwner && !access.inSupportMode;
  return access.isOwner || access.isSuperuser;
}
