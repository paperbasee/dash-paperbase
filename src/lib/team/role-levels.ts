/**
 * Role editor presets (No access / View / Full) for one permission group.
 *
 * Some keys can never be held by a given role (the API lists them per role as
 * `unavailable_permissions`, e.g. only Admin and Manager may hold
 * theming.manage). The presets skip those keys, so choosing "Full" means "as
 * much as this role is allowed", and the save never sends a key the API would
 * refuse with a 400.
 */

import { expandPermissionKeys, type PermissionGroup } from "@/config/permissions";

export type AccessLevel = "none" | "view" | "full" | "custom";

/**
 * The group's keys this role may hold, view gate first. Empty when the view
 * gate itself is unavailable: every other key in the group needs it.
 */
export function availableKeys(
  group: PermissionGroup,
  unavailable: ReadonlySet<string>
): string[] {
  const keys = group.permissions.map((p) => p.key);
  if (unavailable.has(keys[0])) return [];
  return keys.filter((k) => !unavailable.has(k));
}

/**
 * Access level the selected keys represent. "Full" means every action this
 * role may hold, so a missing unavailable key never turns the group "custom".
 * A group whose only allowed key is its view gate reads "view", the same as a
 * single-key group like Analytics: View and Full give exactly the same access.
 */
export function levelForGroup(
  group: PermissionGroup,
  selected: ReadonlySet<string>,
  unavailable: ReadonlySet<string>
): AccessLevel {
  const hasView = selected.has(group.permissions[0].key);
  const actions = availableKeys(group, unavailable).slice(1);
  const chosen = actions.filter((k) => selected.has(k)).length;
  if (!hasView && chosen === 0) return "none";
  if (hasView && chosen === 0) return "view";
  if (hasView && chosen === actions.length) return "full";
  return "custom";
}

/** Replace the group's keys with a preset, never adding an unavailable key. */
export function applyLevel(
  group: PermissionGroup,
  level: Exclude<AccessLevel, "custom">,
  selected: ReadonlySet<string>,
  unavailable: ReadonlySet<string>
): Set<string> {
  const next = new Set(selected);
  for (const p of group.permissions) next.delete(p.key);
  if (level === "none") return next;
  const keys = availableKeys(group, unavailable);
  for (const k of level === "view" ? keys.slice(0, 1) : keys) next.add(k);
  return next;
}

/** The permission list a role save sends: closed over view, minus unavailable keys. */
export function permissionsToSave(
  selected: Iterable<string>,
  unavailable: ReadonlySet<string>
): string[] {
  return [...expandPermissionKeys(selected)].filter((k) => !unavailable.has(k));
}
