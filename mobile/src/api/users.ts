import { apiRequest } from './client';
import type { ActivityLog, User, UserSummary, UserUpdateInput } from '@/src/types/api';

export function getUsers() {
  return apiRequest<User[]>('GET', '/users');
}

export function getUser(id: number) {
  return apiRequest<User>('GET', `/users/${id}`);
}

export function updateUser(id: number, data: UserUpdateInput) {
  return apiRequest<User>('PUT', `/users/${id}`, data);
}

export function getUserSummary(id: number) {
  return apiRequest<UserSummary>('GET', `/users/${id}/summary`);
}

export function getUserActivity(id: number, limit = 50) {
  return apiRequest<ActivityLog[]>('GET', `/users/${id}/activity?limit=${limit}`);
}
