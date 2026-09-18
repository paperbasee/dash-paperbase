"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Layers, Shield, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/UserAvatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notify } from "@/notifications";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/context/PermissionsContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../../SettingsSectionBody";
import {
  useChangeMemberRole,
  useDeleteRole,
  useInviteMember,
  useRemoveMember,
  useRevokeInvite,
  useSetMemberActive,
  useTeamInvites,
  useTeamMembers,
  useTeamRoles,
} from "@/lib/team/hooks";
import type { TeamMember, TeamRole } from "@/lib/team/api";
import { RoleEditorDialog } from "./RoleEditorDialog";
import { MemberCategoryScopeDialog } from "./MemberCategoryScopeDialog";

type Tab = "members" | "roles";

/** Tab id → its name under `settings.team`. */
const TAB_LABEL_KEYS: Record<Tab, string> = {
  members: "tabMembers",
  roles: "tabRoles",
};

/** A member or invite with no role yet. Punctuation, so it is not translated. */
const NO_ROLE = "—";

export default function TeamSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.team");
  const { has, isOwner, permissions } = usePermissions();
  const canManageMembers = has("team.invite");
  const canManageRoles = has("team.manage_roles");
  const grantableKeys = isOwner ? null : permissions;

  const [tab, setTab] = useState<Tab>("members");

  const rolesQuery = useTeamRoles(!hidden);
  const membersQuery = useTeamMembers(!hidden && tab === "members");
  const invitesQuery = useTeamInvites(!hidden && tab === "members" && canManageMembers);

  if (hidden) return null;

  const assignableRoles = (rolesQuery.data ?? []).filter(
    (r) => grantableKeys === null || r.permissions.every((k) => grantableKeys.has(k))
  );

  return (
    <div className={settingsSectionSurfaceClassName}>
      <SettingsSectionBody>
        <div>
          <h2 className="text-lg font-semibold">{t("heading")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex gap-1 rounded-md bg-muted p-0.5 w-fit">
          {(["members", "roles"] as Tab[]).map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setTab(tabId)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                tab === tabId
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(TAB_LABEL_KEYS[tabId])}
            </button>
          ))}
        </div>

        {tab === "members" ? (
          <MembersTab
            membersQuery={membersQuery}
            invitesQuery={invitesQuery}
            roles={assignableRoles}
            canManage={canManageMembers}
          />
        ) : (
          <RolesTab
            rolesQuery={rolesQuery}
            canManage={canManageRoles}
            grantableKeys={grantableKeys}
            isOwner={isOwner}
          />
        )}
      </SettingsSectionBody>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Members                                                                     */
/* -------------------------------------------------------------------------- */

function MembersTab({
  membersQuery,
  invitesQuery,
  roles,
  canManage,
}: {
  membersQuery: ReturnType<typeof useTeamMembers>;
  invitesQuery: ReturnType<typeof useTeamInvites>;
  roles: TeamRole[];
  canManage: boolean;
}) {
  const t = useTranslations("settings.team");
  const tCommon = useTranslations("common");
  const invite = useInviteMember();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !roleId) {
      notify.error(t("inviteMissingFields"));
      return;
    }
    try {
      await invite.mutateAsync({ email: email.trim(), rolePublicId: roleId });
      notify.success({ key: "settings.team.inviteSent" });
      setEmail("");
      setRoleId("");
    } catch (err) {
      notify.error(err);
    }
  }

  const members = membersQuery.data ?? [];
  const pendingInvites = (invitesQuery.data ?? []).filter(
    (i) => i.status === "pending"
  );

  return (
    <div className="space-y-6">
      {canManage && (
        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {t("inviteByEmail")}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("inviteEmailPlaceholder")}
              disabled={invite.isPending}
            />
          </div>
          <div className="space-y-1 sm:w-48">
            <label className="text-xs font-medium text-muted-foreground">
              {t("roleLabel")}
            </label>
            <Select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={invite.isPending}
            >
              <option value="">{t("selectRole")}</option>
              {roles.map((r) => (
                <option key={r.public_id} value={r.public_id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="submit"
            disabled={invite.isPending}
            className={settingsInvertedButtonClassName}
          >
            <UserPlus className="size-4" />
            {invite.isPending ? t("inviteSending") : t("inviteButton")}
          </Button>
        </form>
      )}

      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("pendingInvitesHeading")}
          </h3>
          <div className="divide-y divide-border rounded-md border border-border">
            {pendingInvites.map((inv) => (
              <PendingInviteRow
                key={inv.public_id}
                publicId={inv.public_id}
                email={inv.email}
                roleName={inv.role?.name ?? NO_ROLE}
                canManage={canManage}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("membersHeading")}
        </h3>
        {membersQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {members.map((m) => (
              <MemberRow
                key={m.public_id}
                member={m}
                roles={roles}
                canManage={canManage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingInviteRow({
  publicId,
  email,
  roleName,
  canManage,
}: {
  publicId: string;
  email: string;
  roleName: string;
  canManage: boolean;
}) {
  const t = useTranslations("settings.team");
  const revoke = useRevokeInvite();
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar publicId={publicId} name={email} className="opacity-70" />
        <div className="min-w-0">
          <p className="truncate text-sm">{email}</p>
          <p className="text-xs text-muted-foreground">
            {t("invitedAs", { role: roleName })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{t("pendingBadge")}</Badge>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            disabled={revoke.isPending}
            onClick={async () => {
              try {
                await revoke.mutateAsync(publicId);
                notify.success({ key: "settings.team.inviteRevoked" });
              } catch (err) {
                notify.error(err);
              }
            }}
          >
            {t("revoke")}
          </Button>
        )}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  roles,
  canManage,
}: {
  member: TeamMember;
  roles: TeamRole[];
  canManage: boolean;
}) {
  const t = useTranslations("settings.team");
  const changeRole = useChangeMemberRole();
  const setActive = useSetMemberActive();
  const remove = useRemoveMember();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const manageable = canManage && !member.is_owner;
  const scopeCount = member.allowed_category_public_ids?.length ?? 0;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar
          publicId={member.user.public_id}
          name={member.user.full_name || member.user.email}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {member.user.full_name || member.user.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {member.is_owner ? (
          <Badge>{t("ownerBadge")}</Badge>
        ) : !member.is_active ? (
          <Badge variant="secondary">{t("suspendedBadge")}</Badge>
        ) : null}

        {member.is_owner ? (
          <span className="text-xs text-muted-foreground">{t("ownerFullAccess")}</span>
        ) : manageable ? (
          <Select
            value={member.role?.public_id ?? ""}
            disabled={changeRole.isPending}
            onChange={async (e) => {
              try {
                await changeRole.mutateAsync({
                  membershipPublicId: member.public_id,
                  rolePublicId: e.target.value,
                });
                notify.success({ key: "settings.team.memberRoleUpdated" });
              } catch (err) {
                notify.error(err);
              }
            }}
            className="w-40"
          >
            {member.role &&
              !roles.some((r) => r.public_id === member.role?.public_id) && (
                <option value={member.role.public_id}>{member.role.name}</option>
              )}
            {roles.map((r) => (
              <option key={r.public_id} value={r.public_id}>
                {r.name}
              </option>
            ))}
          </Select>
        ) : (
          <Badge variant="outline">{member.role?.name ?? NO_ROLE}</Badge>
        )}

        {manageable && member.scopeable && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setCatOpen(true)}
            title={t("scopeButtonTitle")}
          >
            <Layers className="size-4" />
            {scopeCount === 0
              ? t("scopeAllCategories")
              : t("scopeSomeCategories", { count: scopeCount })}
          </Button>
        )}

        {manageable && (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={setActive.isPending}
              onClick={async () => {
                try {
                  await setActive.mutateAsync({
                    membershipPublicId: member.public_id,
                    isActive: !member.is_active,
                  });
                  notify.success({
                    key: member.is_active
                      ? "settings.team.memberSuspended"
                      : "settings.team.memberReactivated",
                  });
                } catch (err) {
                  notify.error(err);
                }
              }}
            >
              {member.is_active ? t("suspend") : t("reactivate")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label={t("removeMemberTitle")}
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t("removeMemberTitle")}
        description={t("removeMemberBody", { email: member.user.email })}
        confirmText={t("removeMemberConfirm")}
        variant="danger"
        isConfirmLoading={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(member.public_id);
            notify.success({ key: "settings.team.memberRemoved" });
            setConfirmRemove(false);
          } catch (err) {
            notify.error(err);
          }
        }}
      />

      <MemberCategoryScopeDialog
        member={member}
        open={catOpen}
        onOpenChange={setCatOpen}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                       */
/* -------------------------------------------------------------------------- */

function RolesTab({
  rolesQuery,
  canManage,
  grantableKeys,
  isOwner,
}: {
  rolesQuery: ReturnType<typeof useTeamRoles>;
  canManage: boolean;
  grantableKeys: Set<string> | null;
  isOwner: boolean;
}) {
  const t = useTranslations("settings.team");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("settings");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TeamRole | null>(null);
  const deleteRole = useDeleteRole();
  const [deleteTarget, setDeleteTarget] = useState<TeamRole | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const roles = rolesQuery.data ?? [];
  const reassignOptions = useMemo(
    () => roles.filter((r) => r.public_id !== deleteTarget?.public_id),
    [roles, deleteTarget]
  );

  function openEdit(role: TeamRole) {
    setEditingRole(role);
    setEditorOpen(true);
  }

  const deleteNeedsReassign =
    deleteTarget != null &&
    (deleteTarget.member_count > 0 || deleteTarget.pending_invite_count > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("rolesIntro")}</p>

      {rolesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.public_id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Shield className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {/* A role's name and description are the merchant's own words. */}
                    <p className="truncate text-sm font-medium">{role.name}</p>
                    {role.is_system && <Badge variant="secondary">{t("systemBadge")}</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {role.description ||
                      t("rolePermissionCount", { count: role.permissions.length })}
                    {role.member_count > 0 &&
                      ` · ${t("roleMemberCount", { count: role.member_count })}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                  {!canManage ? t("openRoleView") : t("openRoleEdit")}
                </Button>
                {canManage && !role.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label={t("deleteRoleTitle")}
                    onClick={() => {
                      setDeleteTarget(role);
                      setReassignTo("");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <RoleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        role={editingRole}
        grantableKeys={grantableKeys}
        isOwner={isOwner}
        canManage={canManage}
      />

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteRoleTitle")}</DialogTitle>
            <DialogDescription>
              {deleteNeedsReassign
                ? t("deleteRoleReassignBody", {
                    name: deleteTarget?.name ?? "",
                    members: deleteTarget?.member_count ?? 0,
                    invites: deleteTarget?.pending_invite_count ?? 0,
                  })
                : t("deleteRoleBody", { name: deleteTarget?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>

          {deleteNeedsReassign && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("reassignLabel")}
              </label>
              <Select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full"
              >
                <option value="">{t("selectRole")}</option>
                {reassignOptions.map((r) => (
                  <option key={r.public_id} value={r.public_id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tSettings("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteRole.isPending || (deleteNeedsReassign && !reassignTo)}
              onClick={async () => {
                try {
                  await deleteRole.mutateAsync({
                    publicId: deleteTarget!.public_id,
                    reassignTo: deleteNeedsReassign ? reassignTo : undefined,
                  });
                  notify.success({ key: "settings.team.roleDeleted" });
                  setDeleteTarget(null);
                } catch (err) {
                  notify.error(err);
                }
              }}
            >
              {deleteRole.isPending ? t("deleteRoleDeleting") : t("deleteRoleConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
