import { apiRequest } from './client';
import type { GroupBalances, SettlementPlan } from '@/src/types/api';

export function getBalances(groupId: number) {
  return apiRequest<GroupBalances>('GET', `/groups/${groupId}/balances`);
}

export function getSettlement(groupId: number) {
  return apiRequest<SettlementPlan>('GET', `/groups/${groupId}/settlement`);
}
