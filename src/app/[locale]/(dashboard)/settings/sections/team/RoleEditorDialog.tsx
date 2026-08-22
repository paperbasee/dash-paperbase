"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { notify } from "@/notifications";
import {
  PERMISSION_GROUPS,
  expandPermissionKeys,
  type PermissionGroup,
} from "@/config/permissions";
import { settingsInvertedButtonClassName } from "../../SettingsSectionBody";
import { useCreateRole, useUpdateRole } from "@/lib/team/hooks";
import type { TeamRole } from "@/lib/team/api";

type AccessLevel = "none" | "view" | "full" | "custom";

/** Access level a group's currently-selected keys represent (drives the presets). */
function levelForGroup(group: PermissionGroup, selected: Set<string>): AccessLevel {
  const viewKey = group.permissions[0].key;
  const nonView = group.permissions.slice(1).map((p) => p.key);
  const hasView = selected.has(viewKey);
  const chosenNonView = nonView.filter((k) => selected.has(k));
  if (!hasView && chosenNonView.length === 0) return "none";
  if (hasView && chosenNonView.length === 0) return "view";
  if (hasView && chosenNonView.length === nonView.length) return "full";
  return "custom";
}

function applyLevel(
  group: PermissionGroup,
  level: Exclude<AccessLevel, "custom">,
  selected: Set<string>
): Set<string> {
  const next = new Set(selected);
  for (const p of group.permissions) next.delete(p.key);
  if (level === "view") {
    next.add(group.permissions[0].key);
  } else if (level === "full") {
    for (const p of group.permissions) next.add(p.key);
  }
  return next;
}

const LEVELS: { id: Exclude<AccessLevel, "custom">; label: string }[] = [
  { id: "none", label: "No access" },
  { id: "view", label: "View" },
  { id: "full", label: "Full" },
];

function GroupRow({
  group,
  selected,
  disabled,
  grantable,
  onChange,
}: {
  group: PermissionGroup;
  selected: Set<string>;
  disabled: boolean;
  /** Keys the editor is allowed to grant (their own effective permissions). */
  grantable: Set<string> | null;
  onChange: (next: Set<string>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const level = levelForGroup(group, selected);
  const hasAdvanced = group.permissions.length > 1;

  // A group is ungrantable if the editor lacks even its view key.
  const groupGrantable =
    grantable === null || grantable.has(group.permissions[0].key);

  return (
    <div className={cn("rounded-md border border-border", !groupGrantable && "opacity-50")}>
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {hasAdvanced ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span className="inline-block size-4" />
          )}
          <span className="truncate text-sm font-medium">{group.label}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted p-0.5">
          {LEVELS.map((lvl) => {
            const active = level === lvl.id;
            const isCustom = level === "custom" && lvl.id === "full";
            return (
              <button
                key={lvl.id}
                type="button"
                disabled={disabled || !groupGrantable}
                onClick={() => onChange(applyLevel(group, lvl.id, selected))}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                  isCustom && "ring-1 ring-inset ring-border"
                )}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>
      </div>

      {expanded && hasAdvanced && (
        <div className="space-y-1.5 border-t border-border px-3 py-2.5">
          {level === "custom" && (
            <p className="pb-1 text-xs text-muted-foreground">Custom selection</p>
          )}
          {group.permissions.map((perm, idx) => {
            const isView = idx === 0;
            const checked = selected.has(perm.key);
            const keyGrantable = grantable === null || grantable.has(perm.key);
            return (
              <label
                key={perm.key}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  (!keyGrantable || disabled) && "cursor-not-allowed opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-border"
                  checked={checked}
                  disabled={disabled || !keyGrantable}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) {
                      next.add(perm.key);
                      // Non-view implies view (mirrors server requires-closure).
                      if (!isView) next.add(group.permissions[0].key);
                    } else {
                      next.delete(perm.key);
                      // Unchecking view clears the whole group.
                      if (isView) for (const p of group.permissions) next.delete(p.key);
                    }
                    onChange(next);
                  }}
                />
                <span>{perm.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RoleEditorDialog({
  open,
  onOpenChange,
  role,
  grantableKeys,
  isOwner,
  canManage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The role to edit. */
  role: TeamRole | null;
  /** Editor's own effective permission keys (null = owner/all-access). */
  grantableKeys: Set<string> | null;
  isOwner: boolean;
  /** Whether the viewer can edit roles (team.manage_roles). */
  canManage: boolean;
}) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const editing = role !== null;
  // The 4 built-in roles are editable now (custom-role creation is disabled);
  // only their name/slug is frozen. The whole editor is read-only for viewers
  // who can't manage roles.
  const isSystem = role?.is_system ?? false;
  const readOnly = !canManage;

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(role?.permissions ?? [])
  );

  // Reset local state whenever a different role opens.
  const roleKey = role?.public_id ?? "new";
  const [lastKey, setLastKey] = useState(roleKey);
  if (open && lastKey !== roleKey) {
    setLastKey(roleKey);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setSelected(new Set(role?.permissions ?? []));
  }

  const grantable = isOwner ? null : grantableKeys;
  const saving = createRole.isPending || updateRole.isPending;
  const permissionCount = useMemo(
    () => expandPermissionKeys(selected).size,
    [selected]
  );

  async function handleSave() {
    if (!name.trim()) {
      notify.error("Give the role a name.");
      return;
    }
    const permissions = [...expandPermissionKeys(selected)];
    try {
      if (editing && role) {
        await updateRole.mutateAsync({
          publicId: role.public_id,
          payload: { name: name.trim(), description: description.trim(), permissions },
        });
      } else {
        await createRole.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          permissions,
        });
      }
      notify.success(editing ? "Role updated." : "Role created.");
      onOpenChange(false);
    } catch (err) {
      notify.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>
              {isSystem ? `Edit ${role?.name}` : "Edit role"}
            </DialogTitle>
            <DialogDescription>
              {readOnly
                ? "You don't have permission to edit roles."
                : isSystem
                  ? "Adjust what this built-in role can do — its name is fixed."
                  : "Choose what this role can access. Non-view actions include view automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Role name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={readOnly || isSystem || saving}
                  placeholder="e.g. Moderator"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={readOnly || saving}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Permissions
                </span>
                <span className="text-xs text-muted-foreground">
                  {permissionCount} selected
                </span>
              </div>
              {PERMISSION_GROUPS.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  selected={selected}
                  disabled={readOnly || saving}
                  grantable={grantable}
                  onChange={setSelected}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className={settingsInvertedButtonClassName}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
