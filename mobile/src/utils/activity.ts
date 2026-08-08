import type { ActivityLog } from '@/src/types/api';
import { formatMoney } from './format';

export function activityTitle(log: ActivityLog): string {
  const actor = log.actor_name || 'Someone';
  const details = log.details || {};
  switch (log.action_type) {
    case 'create':
      if (log.entity_type === 'expense') {
        return `${actor} added '${String(details.description ?? 'expense')}'`;
      }
      return `${actor} created ${log.entity_type}`;
    case 'edit':
      return `${actor} edited ${log.entity_type}`;
    case 'delete':
      return `${actor} deleted ${log.entity_type}`;
    case 'payment': {
      const currency = details.currency != null ? String(details.currency) : 'INR';
      const amount =
        details.amount != null ? formatMoney(String(details.amount), currency) : '';
      const to = details.to_user_name != null ? String(details.to_user_name) : 'someone';
      return `${actor} recorded a payment ${amount} → ${to}`.trim();
    }
    case 'member_add':
      return `${actor} added a member`;
    case 'member_remove':
      return `${actor} removed a member`;
    case 'edit_request':
      return `${actor} requested an edit`;
    case 'invite':
      return `${actor} created an invite`;
    default:
      return `${actor} updated ${log.entity_type}`;
  }
}

export function activityIconName(
  log: ActivityLog,
): 'receipt' | 'card' | 'create' | 'person-add' | 'link' | 'ellipse' {
  switch (log.action_type) {
    case 'payment':
      return 'card';
    case 'edit':
    case 'edit_request':
      return 'create';
    case 'member_add':
    case 'member_remove':
      return 'person-add';
    case 'invite':
      return 'link';
    case 'create':
    case 'delete':
      return 'receipt';
    default:
      return 'ellipse';
  }
}
