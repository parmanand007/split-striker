export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface User {
  id: number;
  name: string;
  email: string | null;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Group {
  id: number;
  name: string;
  currency: string;
  archived: boolean;
  simplify_debts: boolean;
  created_by_id: number | null;
  emoji: string | null;
  created_at: string;
  members: User[];
}

export interface GroupCreateInput {
  name: string;
  currency?: string;
  member_ids?: number[];
  simplify_debts?: boolean;
  created_by_id?: number;
  emoji?: string | null;
}

export interface GroupUpdateInput {
  name?: string;
  archived?: boolean;
  simplify_debts?: boolean;
  emoji?: string | null;
}

export interface GroupBalanceItem {
  group_id: number;
  group_name: string;
  balance: string;
  currency?: string;
}

export interface UserSummary {
  user: User;
  total_owed: Record<string, string>;
  total_owing: Record<string, string>;
  group_balances: GroupBalanceItem[];
}

export interface Expense {
  id: number;
  group_id: number | null;
  description: string;
  original_amount: string;
  original_currency: string;
  fx_rate: string;
  total_amount: string;
  paid_by: Record<string, string>;
  split_type: SplitType;
  split_amounts: Record<string, string>;
  split_raw: Record<string, string> | null;
  category: string | null;
  date: string;
  created_at: string;
  updated_at: string | null;
  deleted: boolean;
  is_negative: boolean;
  recurrence_rule: string | null;
  recurrence_end_date: string | null;
  parent_expense_id: number | null;
}

export interface ExpenseCreateInput {
  description: string;
  original_amount: number | string;
  original_currency: string;
  fx_rate?: number | string;
  paid_by: Record<string, number | string>;
  split_type: SplitType;
  split_among: number[];
  split_details?: Record<string, number | string> | null;
  category?: string | null;
  date: string;
  is_negative?: boolean;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  actor_user_id?: number;
}

export interface UserBalance {
  user_id: number;
  user_name: string;
  balance: string;
}

export interface GroupBalances {
  group_id: number;
  currency: string;
  balances: UserBalance[];
  total_check: string;
}

export interface SettlementItem {
  from_user_id: number;
  from_user_name: string;
  to_user_id: number;
  to_user_name: string;
  amount: string;
  currency: string;
}

export interface SettlementPlan {
  group_id: number;
  currency: string;
  simplify_debts: boolean;
  settlements: SettlementItem[];
}

export interface Payment {
  id: number;
  group_id: number | null;
  from_user_id: number;
  to_user_id: number;
  from_user: User;
  to_user: User;
  amount: string;
  currency: string;
  date: string;
  note: string | null;
  created_at: string;
}

export interface PaymentCreateInput {
  from_user_id: number;
  to_user_id: number;
  amount: number | string;
  currency: string;
  date: string;
  note?: string | null;
  actor_user_id?: number;
}

export type ActionType =
  | 'create'
  | 'edit'
  | 'delete'
  | 'payment'
  | 'member_add'
  | 'member_remove'
  | 'edit_request'
  | 'invite';

export type EntityType = 'expense' | 'payment' | 'group' | 'member' | 'edit_request';

export interface ActivityLog {
  id: number;
  group_id: number | null;
  actor_user_id: number | null;
  actor_name: string | null;
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface InvitePreview {
  token: string;
  group_id: number;
  group_name: string;
  group_currency: string;
  member_count: number;
  invited_by: string;
  expires_at: string;
  is_active: boolean;
}

export interface FriendExpenseCreateInput {
  description: string;
  original_amount: number | string;
  original_currency: string;
  payer_user_id: number;
  other_user_id: number;
  category?: string | null;
  date: string;
  actor_user_id?: number;
}

export interface DuplicateWarning {
  is_duplicate: boolean;
  matching_expense_id: number | null;
  message: string | null;
}

export interface EditRequest {
  id: number;
  group_id: number;
  expense_id: number;
  expense_description: string;
  requested_by_id: number;
  requested_by_name: string;
  proposed_changes: Record<string, unknown>;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by_id: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}
