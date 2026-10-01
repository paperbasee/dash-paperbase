"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Layers, Shield, Trash2, UserPlus, X } from "lucide-react";

import { SupportReadOnly } from "@/components/support/SupportReadOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/UserAvatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { notify } from "@/notifications";
import { cn } from "@/lib/utils";
import { useMayChangeOwnerPower } from "@/hooks/useOwnerPower";
import {
  ROLE_MESSAGES,
  ROLE_SLUGS,
  isRoleSlug,
  roleAreas,
  type RoleSlug,
} from "@/config/permissions";
import {
  SettingsSectionBody,
  settingsInvertedButtonClassName,
  settingsSectionSurfaceClassName,
} from "../../SettingsSectionBody";
import {
  useChangeMemberRole,
  useInviteMember,
  useRemoveMember,
  useRevokeInvite,
  useSetMemberActive,
  useTeamInvites,
  useTeamMembers,
  useTeamRoles,
} from "@/lib/team/hooks";
import { isPaused, type TeamMember } from "@/lib/team/api";
import { MemberCategoryScopeDialog } from "./MemberCategoryScopeDialog";

type Tab = "members" | "roles";

/** Tab id → its name under `settings.team`. */
const TAB_LABEL_KEYS: Record<Tab, string> = {
  members: "tabMembers",
  roles: "tabRoles",
};

/** An invite the switch to fixed roles cancelled has no role. Punctuation, so it is not translated. */
const NO_ROLE = "—";

/** A fixed role's name in the reader's language. */
function useRoleName() {
  const t = useTranslations("settings.team");
  return (slug: string | undefined | null) => (isRoleSlug(slug) ? t(ROLE_MESSAGES[slug].name) : NO_ROLE);
}

export default function TeamSection({ hidden }: { hidden: boolean }) {
  const t = useTranslations("settings.team");
  // The team is the owner's alone (config/owner-powers.ts "team"): this tab shows only to them,
  // and Paperbase support, signed in as the owner, reads it and changes nothing.
  const canManage = useMayChangeOwnerPower()("team");
  const canManageMembers = canManage;

  const [tab, setTab] = useState<Tab>("members");

  const rolesQuery = useTeamRoles(!hidden && tab === "roles");
  const membersQuery = useTeamMembers(!hidden && tab === "members");
  const invitesQuery = useTeamInvites(!hidden && tab === "members" && canManageMembers);

  if (hidden) return null;

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

        {/* Who else can get in stays the owner's: support can look at both tabs, change nothing. */}
        <SupportReadOnly>

        {tab === "members" ? (
          <MembersTab
            membersQuery={membersQuery}
            invitesQuery={invitesQuery}
            canManage={canManageMembers}
          />
        ) : (
          <RolesTab rolesQuery={rolesQuery} />
        )}
        </SupportReadOnly>
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
  canManage,
}: {
  membersQuery: ReturnType<typeof useTeamMembers>;
  invitesQuery: ReturnType<typeof useTeamInvites>;
  canManage: boolean;
}) {
  const t = useTranslations("settings.team");
  const tCommon = useTranslations("common");
  const roleName = useRoleName();
  const invite = useInviteMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleSlug | "">("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !role) {
      notify.error(t("inviteMissingFields"));
      return;
    }
    try {
      await invite.mutateAsync({ email: email.trim(), role });
      notify.success({ key: "settings.team.inviteSent" });
      setEmail("");
      setRole("");
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
              value={role}
              onChange={(e) => setRole(isRoleSlug(e.target.value) ? e.target.value : "")}
              disabled={invite.isPending}
            >
              <option value="">{t("selectRole")}</option>
              {ROLE_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {roleName(slug)}
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
                roleName={roleName(inv.role?.slug)}
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
              <MemberRow key={m.public_id} member={m} canManage={canManage} />
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

function MemberRow({ member, canManage }: { member: TeamMember; canManage: boolean }) {
  const t = useTranslations("settings.team");
  const roleName = useRoleName();
  const changeRole = useChangeMemberRole();
  const setActive = useSetMemberActive();
  const remove = useRemoveMember();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const manageable = canManage && !member.is_owner;
  const paused = isPaused(member);
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
          <p className="truncate text-xs text-muted-foreground">
            {paused ? t("pausedHint") : member.user.email}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {member.is_owner ? (
          <Badge>{t("ownerBadge")}</Badge>
        ) : paused ? (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          >
            {t("pausedBadge")}
          </Badge>
        ) : !member.is_active ? (
          <Badge variant="secondary">{t("suspendedBadge")}</Badge>
        ) : null}

        {member.is_owner ? (
          <span className="text-xs text-muted-foreground">{t("ownerFullAccess")}</span>
        ) : manageable ? (
          <Select
            value={member.role?.slug ?? ""}
            disabled={changeRole.isPending}
            aria-label={t("roleLabel")}
            onChange={async (e) => {
              const role = e.target.value;
              if (!isRoleSlug(role)) return;
              try {
                await changeRole.mutateAsync({ membershipPublicId: member.public_id, role });
                // Choosing a paused member's role is what lets them back in.
                notify.success({
                  key: paused ? "settings.team.memberResumed" : "settings.team.memberRoleUpdated",
                });
              } catch (err) {
                notify.error(err);
              }
            }}
            className="w-40"
          >
            {paused && <option value="">{t("selectRole")}</option>}
            {ROLE_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {roleName(slug)}
              </option>
            ))}
          </Select>
        ) : (
          <Badge variant="outline">{roleName(member.role?.slug)}</Badge>
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
            {!paused && (
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
            )}
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

/**
 * The three fixed roles as cards (owner, 2026-10-02): nobody edits them. Each line is ticked from
 * the keys the API itself says the role holds (config/permissions.ts `roleAreas`), so a card can
 * never promise what the API refuses.
 */
function RolesTab({ rolesQuery }: { rolesQuery: ReturnType<typeof useTeamRoles> }) {
  const t = useTranslations("settings.team");
  const tCommon = useTranslations("common");
  const roles = (rolesQuery.data ?? []).filter((role) => isRoleSlug(role.slug));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("rolesIntro")}</p>

      {rolesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {roles.map((role) => {
            const { can, cannot } = roleAreas(new Set(role.permissions));
            const names = ROLE_MESSAGES[role.slug];
            return (
              <section
                key={role.slug}
                aria-labelledby={`role-${role.slug}`}
                className="flex flex-col gap-3 rounded-card border border-border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id={`role-${role.slug}`} className="flex items-center gap-2 text-sm font-semibold">
                      <Shield className="size-4 text-muted-foreground" aria-hidden />
                      {t(names.name)}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {t("roleMemberCount", { count: role.member_count })}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t(names.summary)}</p>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {can.map((area) => (
                    <li key={area.labelKey} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      <span>{t(area.labelKey)}</span>
                    </li>
                  ))}
                  {cannot.map((area) => (
                    <li key={area.labelKey} className="flex items-start gap-2 text-muted-foreground">
                      <X className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span className="sr-only">{t("roleCannot")} </span>
                      <span>{t(area.labelKey)}</span>
                    </li>
                  ))}
                </ul>
                {role.category_limits && (
                  <p className="mt-auto flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <Layers className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {t("roleCategoryLimits")}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t("rolesOwnerOnly")}</p>
    </div>
  );
}
