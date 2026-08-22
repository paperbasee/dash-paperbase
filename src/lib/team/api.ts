import api from "@/lib/api";

export interface TeamRole {
  public_id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  is_system: boolean;
  permissions: string[];
  member_count: number;
  pending_invite_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  public_id: string;
  user: { public_id: string; email: string; full_name: string };
  role: { public_id: string; name: string; slug: string; is_system: boolean } | null;
  is_owner: boolean;
  is_active: boolean;
  created_at: string;
  /** Department scoping: categories this member is limited to (empty = all). */
  allowed_category_public_ids: string[];
  /** Whether this member may be category-limited at all (owner/admin never are). */
  scopeable: boolean;
}

export interface TeamInvite {
  public_id: string;
  email: string;
  role: { public_id: string; name: string; slug: string; is_system: boolean } | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by_name: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
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

export interface RoleWritePayload {
  name?: string;
  description?: string;
  color?: string;
  permissions?: string[];
  clone_from?: string;
}

export async function createRole(payload: RoleWritePayload): Promise<TeamRole> {
  const { data } = await api.post<TeamRole>("admin/team/roles/", payload);
  return data;
}

export async function updateRole(
  publicId: string,
  payload: RoleWritePayload
): Promise<TeamRole> {
  const { data } = await api.patch<TeamRole>(
    `admin/team/roles/${publicId}/`,
    payload
  );
  return data;
}

export async function deleteRole(
  publicId: string,
  reassignTo?: string
): Promise<void> {
  // DELETE carries no body through the axios-compat client, so reassignment
  // travels as a query param (the backend reads query first, then body).
  await api.delete(`admin/team/roles/${publicId}/`, {
    params: reassignTo ? { reassign_to: reassignTo } : undefined,
  });
}

export async function inviteMember(
  email: string,
  rolePublicId: string
): Promise<TeamInvite> {
  const { data } = await api.post<TeamInvite>("admin/team/invites/", {
    email,
    role_public_id: rolePublicId,
  });
  return data;
}

export async function revokeInvite(publicId: string): Promise<void> {
  await api.post(`admin/team/invites/${publicId}/revoke/`);
}

export async function changeMemberRole(
  membershipPublicId: string,
  rolePublicId: string
): Promise<TeamMember> {
  const { data } = await api.post<TeamMember>(
    `admin/team/members/${membershipPublicId}/set-role/`,
    { role_public_id: rolePublicId }
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
