"use client";

import { useMemo, useState } from "react";
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

export default function TeamSection({ hidden }: { hidden: boolean }) {
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
          <h2 className="text-lg font-semibold">Team &amp; roles</h2>
          <p className="text-sm text-muted-foreground">
            Invite people and control what they can access with roles.
          </p>
        </div>

        <div className="flex gap-1 rounded-md bg-muted p-0.5 w-fit">
          {(["members", "roles"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                tab === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
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
  const invite = useInviteMember();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !roleId) {
      notify.error("Enter an email and pick a role.");
      return;
    }
    try {
      await invite.mutateAsync({ email: email.trim(), rolePublicId: roleId });
      notify.success("Invitation sent.");
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
              Invite by email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
              disabled={invite.isPending}
            />
          </div>
          <div className="space-y-1 sm:w-48">
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <Select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={invite.isPending}
            >
              <option value="">Select role…</option>
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
            {invite.isPending ? "Sending…" : "Invite"}
          </Button>
        </form>
      )}

      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending invites
          </h3>
          <div className="divide-y divide-border rounded-md border border-border">
            {pendingInvites.map((inv) => (
              <PendingInviteRow
                key={inv.public_id}
                publicId={inv.public_id}
                email={inv.email}
                roleName={inv.role?.name ?? "—"}
                canManage={canManage}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Members</h3>
        {membersQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
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
  const revoke = useRevokeInvite();
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar publicId={publicId} name={email} className="opacity-70" />
        <div className="min-w-0">
          <p className="truncate text-sm">{email}</p>
          <p className="text-xs text-muted-foreground">Invited as {roleName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Pending</Badge>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            disabled={revoke.isPending}
            onClick={async () => {
              try {
                await revoke.mutateAsync(publicId);
                notify.success("Invite revoked.");
              } catch (err) {
                notify.error(err);
              }
            }}
          >
            Revoke
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
          <Badge>Owner</Badge>
        ) : !member.is_active ? (
          <Badge variant="secondary">Suspended</Badge>
        ) : null}

        {member.is_owner ? (
          <span className="text-xs text-muted-foreground">Full access</span>
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
                notify.success("Role updated.");
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
          <Badge variant="outline">{member.role?.name ?? "—"}</Badge>
        )}

        {manageable && member.scopeable && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setCatOpen(true)}
            title="Limit this member to specific categories (departments)"
          >
            <Layers className="size-4" />
            {scopeCount === 0
              ? "All categories"
              : `${scopeCount} categor${scopeCount === 1 ? "y" : "ies"}`}
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
                  notify.success(member.is_active ? "Suspended." : "Reactivated.");
                } catch (err) {
                  notify.error(err);
                }
              }}
            >
              {member.is_active ? "Suspend" : "Reactivate"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
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
        title="Remove member"
        description={`Remove ${member.user.email} from the team? They lose all access immediately.`}
        confirmText="Remove"
        variant="danger"
        isConfirmLoading={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(member.public_id);
            notify.success("Member removed.");
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
      <p className="text-sm text-muted-foreground">
        Your store has four built-in roles. You can tune what each one can access,
        but you can&apos;t add or remove roles.
      </p>

      {rolesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
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
                    <p className="truncate text-sm font-medium">{role.name}</p>
                    {role.is_system && <Badge variant="secondary">System</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {role.description || `${role.permissions.length} permissions`}
                    {role.member_count > 0 && ` · ${role.member_count} member(s)`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                  {!canManage ? "View" : "Edit"}
                </Button>
                {canManage && !role.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
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
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription>
              {deleteNeedsReassign
                ? `“${deleteTarget?.name}” is used by ${deleteTarget?.member_count} member(s) and ${deleteTarget?.pending_invite_count} pending invite(s). Reassign them to another role, then delete.`
                : `Delete the role “${deleteTarget?.name}”? This can't be undone.`}
            </DialogDescription>
          </DialogHeader>

          {deleteNeedsReassign && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Reassign members &amp; invites to
              </label>
              <Select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="w-full"
              >
                <option value="">Select role…</option>
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
              Cancel
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
                  notify.success("Role deleted.");
                  setDeleteTarget(null);
                } catch (err) {
                  notify.error(err);
                }
              }}
            >
              {deleteRole.isPending ? "Deleting…" : "Delete role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
