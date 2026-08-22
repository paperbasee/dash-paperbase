"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  teamInvitesQueryKey,
  teamMembersQueryKey,
  teamRolesQueryKey,
  myPermissionsQueryKey,
} from "@/lib/query-keys";
import {
  changeMemberRole,
  createRole,
  deleteRole,
  fetchInvites,
  fetchMembers,
  fetchRoles,
  inviteMember,
  removeMember,
  revokeInvite,
  setMemberActive,
  setMemberCategories,
  updateRole,
  type RoleWritePayload,
} from "@/lib/team/api";

const TEAM_STALE_MS = 60 * 1000;

export function useTeamRoles(enabled = true) {
  return useQuery({
    queryKey: teamRolesQueryKey,
    queryFn: fetchRoles,
    staleTime: TEAM_STALE_MS,
    enabled,
  });
}

export function useTeamMembers(enabled = true) {
  return useQuery({
    queryKey: teamMembersQueryKey,
    queryFn: fetchMembers,
    staleTime: TEAM_STALE_MS,
    enabled,
  });
}

export function useTeamInvites(enabled = true) {
  return useQuery({
    queryKey: teamInvitesQueryKey,
    queryFn: fetchInvites,
    staleTime: TEAM_STALE_MS,
    enabled,
  });
}

/** Invalidate every team surface + the caller's own permission set. */
function useInvalidateTeam() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: teamRolesQueryKey });
    qc.invalidateQueries({ queryKey: teamMembersQueryKey });
    qc.invalidateQueries({ queryKey: teamInvitesQueryKey });
    qc.invalidateQueries({ queryKey: myPermissionsQueryKey });
  };
}

export function useCreateRole() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (payload: RoleWritePayload) => createRole(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({ publicId, payload }: { publicId: string; payload: RoleWritePayload }) =>
      updateRole(publicId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({ publicId, reassignTo }: { publicId: string; reassignTo?: string }) =>
      deleteRole(publicId, reassignTo),
    onSuccess: invalidate,
  });
}

export function useInviteMember() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({ email, rolePublicId }: { email: string; rolePublicId: string }) =>
      inviteMember(email, rolePublicId),
    onSuccess: invalidate,
  });
}

export function useRevokeInvite() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (publicId: string) => revokeInvite(publicId),
    onSuccess: invalidate,
  });
}

export function useChangeMemberRole() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({
      membershipPublicId,
      rolePublicId,
    }: {
      membershipPublicId: string;
      rolePublicId: string;
    }) => changeMemberRole(membershipPublicId, rolePublicId),
    onSuccess: invalidate,
  });
}

export function useSetMemberActive() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({
      membershipPublicId,
      isActive,
    }: {
      membershipPublicId: string;
      isActive: boolean;
    }) => setMemberActive(membershipPublicId, isActive),
    onSuccess: invalidate,
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: (membershipPublicId: string) => removeMember(membershipPublicId),
    onSuccess: invalidate,
  });
}

export function useSetMemberCategories() {
  const invalidate = useInvalidateTeam();
  return useMutation({
    mutationFn: ({
      membershipPublicId,
      categoryPublicIds,
    }: {
      membershipPublicId: string;
      categoryPublicIds: string[];
    }) => setMemberCategories(membershipPublicId, categoryPublicIds),
    onSuccess: invalidate,
  });
}
