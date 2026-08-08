#!/usr/bin/env node
/**
 * End-to-end API path used by the iOS app:
 * signup → login → create group → add expense → summary/balances/activity
 */
const API = (process.env.API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const stamp = Date.now();
const emailA = `e2e_a_${stamp}@test.com`;
const emailB = `e2e_b_${stamp}@test.com`;
const password = 'testpass123';

console.log(`API: ${API}`);

const health = await req('GET', '/health');
assert(health?.status === 'ok', 'health failed');
console.log('✓ health');

const signupA = await req('POST', '/auth/signup', {
  body: { name: 'E2E Alice', email: emailA, password },
});
assert(signupA.token && signupA.user?.id, 'signup A missing token/user');
console.log('✓ signup A', signupA.user.id);

const signupB = await req('POST', '/auth/signup', {
  body: { name: 'E2E Bob', email: emailB, password },
});
assert(signupB.user?.id, 'signup B failed');
console.log('✓ signup B', signupB.user.id);

const login = await req('POST', '/auth/login', {
  body: { email: emailA, password },
});
assert(login.token, 'login missing token');
const token = login.token;
const userId = login.user.id;
console.log('✓ login');

const summary0 = await req('GET', `/users/${userId}/summary`, { token });
assert(summary0.user?.id === userId, 'summary user mismatch');
console.log('✓ home summary (empty)');

const groups0 = await req('GET', '/groups', { token });
assert(Array.isArray(groups0), 'groups not array');
console.log('✓ groups list');

const group = await req('POST', '/groups', {
  token,
  body: {
    name: `Goa Trip ${stamp}`,
    currency: 'INR',
    emoji: '🏖️',
    created_by_id: userId,
    member_ids: [userId, signupB.user.id],
    simplify_debts: true,
  },
});
assert(group.id && group.members?.length >= 2, 'group create failed');
console.log('✓ create group', group.id, `(${group.members.length} members)`);

const today = new Date();
const date = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0'),
].join('-');

const expense = await req('POST', `/groups/${group.id}/expenses`, {
  token,
  body: {
    description: 'Beach dinner',
    original_amount: '1200',
    original_currency: 'INR',
    paid_by: { [String(userId)]: '1200' },
    split_type: 'equal',
    split_among: [userId, signupB.user.id],
    category: 'Food',
    date,
    actor_user_id: userId,
  },
});
assert(expense.id, 'expense create failed');
console.log('✓ create expense', expense.id, expense.total_amount);

const expenses = await req('GET', `/groups/${group.id}/expenses`, { token });
assert(expenses.some((e) => e.id === expense.id), 'expense missing from list');
console.log('✓ list expenses', expenses.length);

const balances = await req('GET', `/groups/${group.id}/balances`, { token });
assert(balances != null, 'balances missing');
console.log('✓ balances', JSON.stringify(balances).slice(0, 120));

const summary1 = await req('GET', `/users/${userId}/summary`, { token });
assert(
  Object.keys(summary1.total_owed || {}).length > 0 ||
    (summary1.group_balances || []).length > 0,
  'summary should reflect expense',
);
console.log('✓ home summary after expense');

const activity = await req('GET', `/users/${userId}/activity?limit=20`, { token });
assert(Array.isArray(activity) && activity.length > 0, 'activity empty');
console.log('✓ activity', activity.length, 'events');

const detail = await req('GET', `/expenses/${expense.id}`, { token });
assert(detail.id === expense.id, 'expense detail mismatch');
console.log('✓ expense detail');

console.log('\nE2E API path passed (signup → login → group → expense → home data).');
