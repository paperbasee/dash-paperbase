import api from "@/lib/api";
import type { RoleSlug } from "@/config/permissions";

/** One of the three fixed roles, as the API names it (rbac.serializers.role_brief). */
export interface RoleBrief {
  slug: RoleSlug;
  name: string;
  description: string;
}

/** A role card on Settings → Team: what the role holds, and who holds it. */
export interface TeamRole extends RoleBrief {
  permissions: string[];
  /** Whether the owner may limit this role to some categories (Staff only). */
  category_limits: boolean;
  member_count: number;
  pending_invite_count: number;
}

export interface TeamMember {
  public_id: string;
  user: { public_id: string; email: string; full_name: string };
  /** Null for the owner, and for a member paused at the switch to fixed roles until one is chosen. */
  role: RoleBrief | null;
  is_owner: boolean;
  is_active: boolean;
  created_at: string;
  /** Department scoping: categories this member is limited to (empty = all). */
  allowed_category_public_ids: string[];
  /** Whether this member may be category-limited at all (Staff only). */
  scopeable: boolean;
}

export interface TeamInvite {
  public_id: string;
  email: string;
  role: RoleBrief | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by_name: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/** A member the switch to fixed roles could not place: no role, no access, until the owner picks one. */
export function isPaused(member: TeamMember): boolean {
  return !member.is_owner && member.role === null;
}

/** DRF list endpoints may paginate; normalize to a plain array. */
function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export async function fetchRoles(): Promise<TeamRole[]> {
  const { data } = await api.get("admin/team/roles/");
  return unwrapList<TeamRole>(data);
}

export async function fetchMembers(): Promise<TeamMember[]> {
  const { data } = await api.get("admin/team/members/");
  return unwrapList<TeamMember>(data);
}

export async function fetchInvites(): Promise<TeamInvite[]> {
  const { data } = await api.get("admin/team/invites/");
  return unwrapList<TeamInvite>(data);
}

export async function inviteMember(email: string, role: RoleSlug): Promise<TeamInvite> {
  const { data } = await api.post<TeamInvite>("admin/team/invites/", { email, role });
  return data;
}

export async function revokeInvite(publicId: string): Promise<void> {
  await api.post(`admin/team/invites/${publicId}/revoke/`);
}

export async function changeMemberRole(
  membershipPublicId: string,
  role: RoleSlug
): Promise<TeamMember> {
  const { data } = await api.post<TeamMember>(
    `admin/team/members/${membershipPublicId}/set-role/`,
    { role }
  );
  return data;
}

export async function setMemberActive(
  membershipPublicId: string,
  isActive: boolean
): Promise<TeamMember> {
  const action = isActive ? "activate" : "deactivate";
  const { data } = await api.post<TeamMember>(
    `admin/team/members/${membershipPublicId}/${action}/`
  );
  return data;
}

export async function removeMember(membershipPublicId: string): Promise<void> {
  await api.delete(`admin/team/members/${membershipPublicId}/`);
}

export async function setMemberCategories(
  membershipPublicId: string,
  categoryPublicIds: string[]
): Promise<TeamMember> {
  const { data } = await api.post<TeamMember>(
    `admin/team/members/${membershipPublicId}/categories/`,
    { category_public_ids: categoryPublicIds }
  );
  return data;
}
