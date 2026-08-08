import { apiRequest } from './client';
import type { Payment, PaymentCreateInput } from '@/src/types/api';

export function getPayments(groupId: number) {
  return apiRequest<Payment[]>('GET', `/groups/${groupId}/payments`);
}

export function createPayment(groupId: number, data: PaymentCreateInput) {
  return apiRequest<Payment>('POST', `/groups/${groupId}/payments`, data);
}
