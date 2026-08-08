import { apiRequest } from './client';
import type {
  DuplicateWarning,
  Expense,
  ExpenseCreateInput,
  FriendExpenseCreateInput,
} from '@/src/types/api';

export function getExpenses(groupId: number) {
  return apiRequest<Expense[]>('GET', `/groups/${groupId}/expenses`);
}

export function getExpense(id: number) {
  return apiRequest<Expense>('GET', `/expenses/${id}`);
}

export function createExpense(groupId: number, data: ExpenseCreateInput) {
  return apiRequest<Expense>('POST', `/groups/${groupId}/expenses`, data);
}

export function updateExpense(id: number, data: Partial<ExpenseCreateInput>) {
  return apiRequest<Expense>('PUT', `/expenses/${id}`, data);
}

export function deleteExpense(id: number, actorUserId?: number) {
  const q = actorUserId ? `?actor_user_id=${actorUserId}` : '';
  return apiRequest<null>('DELETE', `/expenses/${id}${q}`);
}

export function checkDuplicate(
  groupId: number,
  params: { description: string; amount: string; payer_id: string },
) {
  const qs = new URLSearchParams(params).toString();
  return apiRequest<DuplicateWarning>('GET', `/groups/${groupId}/expenses/check-duplicate?${qs}`);
}

export function createFriendExpense(data: FriendExpenseCreateInput) {
  return apiRequest<Expense>('POST', '/friend-expenses', data);
}

export function getFriendExpenses(userId: number) {
  return apiRequest<Expense[]>('GET', `/users/${userId}/friend-expenses`);
}

export function createEditRequest(
  expenseId: number,
  data: {
    requested_by_id: number;
    proposed_changes: Record<string, unknown>;
    message?: string;
  },
) {
  return apiRequest('POST', `/expenses/${expenseId}/edit-request`, data);
}
