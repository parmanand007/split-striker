import { apiRequest } from './client';
import type {
  ActivityLog,
  EditRequest,
  Group,
  GroupCreateInput,
  GroupUpdateInput,
  InvitePreview,
} from '@/src/types/api';

export function getGroups() {
  return apiRequest<Group[]>('GET', '/groups');
}

export function getGroup(id: number) {
  return apiRequest<Group>('GET', `/groups/${id}`);
}

export function createGroup(data: GroupCreateInput) {
  return apiRequest<Group>('POST', '/groups', data);
}

export function updateGroup(id: number, data: GroupUpdateInput) {
  return apiRequest<Group>('PUT', `/groups/${id}`, data);
}

export function deleteGroup(id: number, actorUserId: number) {
  return apiRequest<null>('DELETE', `/groups/${id}?actor_user_id=${actorUserId}`);
}

export function addMember(groupId: number, userId: number) {
  return apiRequest<Group>('POST', `/groups/${groupId}/members`, { user_id: userId });
}

export function removeMember(groupId: number, userId: number) {
  return apiRequest<Group>('DELETE', `/groups/${groupId}/members/${userId}`);
}

export function getGroupActivity(groupId: number, limit = 50) {
  return apiRequest<ActivityLog[]>('GET', `/groups/${groupId}/activity?limit=${limit}`);
}

export function createInvite(groupId: number, actorUserId: number) {
  return apiRequest<{ token: string; expires_at: string }>(
    'POST',
    `/invite/groups/${groupId}/create?actor_user_id=${actorUserId}`,
  );
}

export function getInvite(token: string) {
  return apiRequest<InvitePreview>('GET', `/invite/${token}`, undefined, { auth: false });
}

export function acceptInvite(token: string, userId: number) {
  return apiRequest<{ message: string; group_id: number }>(
    'POST',
    `/invite/${token}/accept`,
    { user_id: userId },
    { auth: false },
  );
}

export function getEditRequests(groupId: number, status = 'pending') {
  return apiRequest<EditRequest[]>(
    'GET',
    `/groups/${groupId}/edit-requests?status=${encodeURIComponent(status)}`,
  );
}

export function reviewEditRequest(
  id: number,
  data: { status: 'approved' | 'rejected'; actor_user_id: number },
) {
  return apiRequest<EditRequest>('PUT', `/edit-requests/${id}/review`, data);
}
