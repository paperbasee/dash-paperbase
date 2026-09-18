"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { PERMISSION_GROUPS, type PermissionGroup } from "@/config/permissions";
import { settingsInvertedButtonClassName } from "../../SettingsSectionBody";
import { useCreateRole, useUpdateRole } from "@/lib/team/hooks";
import type { TeamRole } from "@/lib/team/api";
import {
  applyLevel,
  levelForGroup,
  permissionsToSave,
  type AccessLevel,
} from "@/lib/team/role-levels";

// Only theming.manage is limited today, and the API allows it to Admin and
// Manager, which is what `unavailableNote` says in both languages
// (tests/config/permissions.test.ts keeps that note honest).
const LEVELS: { id: Exclude<AccessLevel, "custom">; labelKey: string }[] = [
  { id: "none", labelKey: "levelNone" },
  { id: "view", labelKey: "levelView" },
  { id: "full", labelKey: "levelFull" },
];

function GroupRow({
  group,
  selected,
  disabled,
  grantable,
  unavailable,
  onChange,
}: {
  group: PermissionGroup;
  selected: Set<string>;
  disabled: boolean;
  /** Keys the editor is allowed to grant (their own effective permissions). */
  grantable: Set<string> | null;
  /** Keys this role can never hold; shown switched off and never saved. */
  unavailable: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}) {
  const t = useTranslations("settings.team");
  const [expanded, setExpanded] = useState(false);
  const level = levelForGroup(group, selected, unavailable);
  const hasAdvanced = group.permissions.length > 1;
  const unavailableLabels = group.permissions
    .filter((p) => unavailable.has(p.key))
    .map((p) => t(p.labelKey));

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
              aria-label={expanded ? t("collapseGroup") : t("expandGroup")}
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
          <span className="truncate text-sm font-medium">{t(group.labelKey)}</span>
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
                onClick={() => onChange(applyLevel(group, lvl.id, selected, unavailable))}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                  isCustom && "ring-1 ring-inset ring-border"
                )}
              >
                {t(lvl.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {unavailableLabels.length > 0 && (
        <p className="-mt-1 px-3 pb-2.5 pl-9 text-xs text-muted-foreground">
          {t("unavailableNote", { permissions: unavailableLabels.join(", ") })}
        </p>
      )}

      {expanded && hasAdvanced && (
        <div className="space-y-1.5 border-t border-border px-3 py-2.5">
          {level === "custom" && (
            <p className="pb-1 text-xs text-muted-foreground">{t("customSelection")}</p>
          )}
          {group.permissions.map((perm, idx) => {
            const isView = idx === 0;
            const checked = selected.has(perm.key);
            const keyGrantable =
              !unavailable.has(perm.key) && (grantable === null || grantable.has(perm.key));
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
                <span>{t(perm.labelKey)}</span>
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
  const t = useTranslations("settings.team");
  const tSettings = useTranslations("settings");
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
  // `?? []`: a roles list persisted before the API sent this field has none.
  const unavailablePermissions = role?.unavailable_permissions;
  const unavailable = useMemo(
    () => new Set(unavailablePermissions ?? []),
    [unavailablePermissions]
  );
  const saving = createRole.isPending || updateRole.isPending;
  const permissionCount = useMemo(
    () => permissionsToSave(selected, unavailable).length,
    [selected, unavailable]
  );

  async function handleSave() {
    if (!name.trim()) {
      notify.error(t("roleNameRequired"));
      return;
    }
    const permissions = permissionsToSave(selected, unavailable);
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
      notify.success({ key: editing ? "settings.team.roleUpdated" : "settings.team.roleCreated" });
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
              {/* A built-in role's name is the API's, the same word the roles list shows. */}
              {isSystem ? t("editorTitleFixed", { role: role?.name ?? "" }) : t("editorTitle")}
            </DialogTitle>
            <DialogDescription>
              {readOnly
                ? t("editorReadOnly")
                : isSystem
                  ? t("editorSystemHint")
                  : t("editorCustomHint")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("roleNameLabel")}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={readOnly || isSystem || saving}
                  placeholder={t("roleNamePlaceholder")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("roleDescriptionLabel")}
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={readOnly || saving}
                  placeholder={t("roleDescriptionPlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("permissionsHeading")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("permissionsSelected", { count: permissionCount })}
                </span>
              </div>
              {PERMISSION_GROUPS.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  selected={selected}
                  disabled={readOnly || saving}
                  grantable={grantable}
                  unavailable={unavailable}
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
              {readOnly ? tSettings("close") : tSettings("cancel")}
            </Button>
            {!readOnly && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className={settingsInvertedButtonClassName}
              >
                {saving ? tSettings("saving") : t("saveChanges")}
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
