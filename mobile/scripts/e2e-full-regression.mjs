#!/usr/bin/env node
/**
 * Full API E2E regression for recent features + core expense math.
 * Real backend + DB. No mocks.
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
  return { ok: res.ok, status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function todayISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

const stamp = Date.now();
const password = 'testpass123';
const emailA = `qa_a_${stamp}@test.com`;
const emailB = `qa_b_${stamp}@test.com`;
const emailC = `qa_c_${stamp}@test.com`;
let pass = 0;
let fail = 0;
const results = [];

async function step(name, fn) {
  try {
    await fn();
    pass += 1;
    results.push({ name, status: 'PASS' });
    console.log(`✓ ${name}`);
  } catch (e) {
    fail += 1;
    results.push({ name, status: 'FAIL', error: String(e.message || e) });
    console.error(`✗ ${name}: ${e.message || e}`);
  }
}

console.log(`API: ${API}\n`);

let tokenA, tokenB, tokenC, userA, userB, userC, group, expense;

await step('health', async () => {
  const r = await req('GET', '/health');
  assert(r.ok && r.data?.status === 'ok', JSON.stringify(r.data));
});

await step('signup A/B/C', async () => {
  const a = await req('POST', '/auth/signup', {
    body: { name: 'QA Alice', email: emailA, password },
  });
  const b = await req('POST', '/auth/signup', {
    body: { name: 'QA Bob', email: emailB, password },
  });
  const c = await req('POST', '/auth/signup', {
    body: { name: 'QA Carol', email: emailC, password },
  });
  assert(a.ok && b.ok && c.ok, 'signup failed');
  tokenA = a.data.token;
  tokenB = b.data.token;
  tokenC = c.data.token;
  userA = a.data.user;
  userB = b.data.user;
  userC = c.data.user;
});

await step('invalid login rejected', async () => {
  const r = await req('POST', '/auth/login', {
    body: { email: emailA, password: 'wrong-password' },
  });
  assert(!r.ok && (r.status === 401 || r.status === 400), `expected auth fail, got ${r.status}`);
});

await step('login A', async () => {
  const r = await req('POST', '/auth/login', {
    body: { email: emailA, password },
  });
  assert(r.ok && r.data.token, 'login failed');
  tokenA = r.data.token;
});

await step('unauthorized without token', async () => {
  const r = await req('GET', '/groups');
  assert(r.status === 401, `expected 401, got ${r.status}`);
});

await step('profile update persists', async () => {
  const updated = await req('PUT', `/users/${userA.id}`, {
    token: tokenA,
    body: { name: 'QA Alice Updated', email: `qa_a_upd_${stamp}@test.com` },
  });
  assert(updated.ok, JSON.stringify(updated.data));
  assert(updated.data.name === 'QA Alice Updated', 'name not updated');
  const again = await req('GET', `/users/${userA.id}`, { token: tokenA });
  assert(again.data.name === 'QA Alice Updated', 'GET after update mismatch');
  userA = again.data;
});

await step('cannot update another user profile', async () => {
  const r = await req('PUT', `/users/${userB.id}`, {
    token: tokenA,
    body: { name: 'Hacked' },
  });
  assert(r.status === 403, `expected 403, got ${r.status}`);
});

await step('create group with 3 members via invites', async () => {
  const r = await req('POST', '/groups', {
    token: tokenA,
    body: {
      name: `QA Trip ${stamp}`,
      currency: 'INR',
      emoji: '🏖️',
      created_by_id: userA.id,
      member_ids: [userA.id],
      simplify_debts: true,
    },
  });
  assert(r.ok && r.data.members.length === 1, JSON.stringify(r.data));
  group = r.data;

  for (const u of [userB, userC]) {
    const inv = await req('POST', `/invite/groups/${group.id}/create?actor_user_id=${userA.id}`, {
      token: tokenA,
    });
    assert(inv.ok, JSON.stringify(inv.data));
    const acc = await req('POST', `/invite/${inv.data.token}/accept`, {
      token: u === userB ? tokenB : tokenC,
      body: { user_id: u.id },
    });
    assert(acc.ok, JSON.stringify(acc.data));
  }

  const g2 = await req('GET', `/groups/${group.id}`, { token: tokenA });
  assert(g2.ok && g2.data.members.length === 3, `members=${g2.data.members.length}`);
  group = g2.data;
});

await step('set trip budget + category budgets', async () => {
  const r = await req('PUT', `/groups/${group.id}`, {
    token: tokenA,
    body: {
      budget: '50000',
      category_budgets: { 'Food & Drink': '12000', Transport: '8000' },
    },
  });
  assert(r.ok, JSON.stringify(r.data));
  assert(Number(r.data.budget) === 50000, `budget=${r.data.budget}`);
  assert(r.data.category_budgets['Food & Drink'] === '12000', 'cat budget missing');
  group = r.data;
});

await step('create expense 2400 Food & Drink equal split 3', async () => {
  const r = await req('POST', `/groups/${group.id}/expenses`, {
    token: tokenA,
    body: {
      description: 'Dinner',
      original_amount: '2400',
      original_currency: 'INR',
      paid_by: { [String(userA.id)]: '2400' },
      split_type: 'equal',
      split_among: [userA.id, userB.id, userC.id],
      category: 'Food & Drink',
      date: todayISO(),
      actor_user_id: userA.id,
    },
  });
  assert(r.ok, JSON.stringify(r.data));
  expense = r.data;
  assert(expense.category === 'Food & Drink', 'category mismatch');
  assert(Number(expense.total_amount) === 2400, 'total mismatch');
  // equal split: 800 each
  assert(Number(expense.split_amounts[String(userA.id)]) === 800, 'A share');
  assert(Number(expense.split_amounts[String(userB.id)]) === 800, 'B share');
  assert(Number(expense.split_amounts[String(userC.id)]) === 800, 'C share');
});

await step('balances after dinner: A owed 1600', async () => {
  const r = await req('GET', `/groups/${group.id}/balances`, { token: tokenA });
  assert(r.ok, JSON.stringify(r.data));
  const map = Object.fromEntries(r.data.balances.map((b) => [b.user_id, Number(b.balance)]));
  // A paid 2400, share 800 => +1600; B/C => -800 each
  assert(Math.abs(map[userA.id] - 1600) < 0.01, `A bal ${map[userA.id]}`);
  assert(Math.abs(map[userB.id] + 800) < 0.01, `B bal ${map[userB.id]}`);
  assert(Math.abs(map[userC.id] + 800) < 0.01, `C bal ${map[userC.id]}`);
});

await step('trip budget spent reflects expense', async () => {
  const list = await req('GET', `/groups/${group.id}/expenses`, { token: tokenA });
  const spent = list.data
    .filter((e) => !e.deleted)
    .reduce((s, e) => s + Number(e.total_amount), 0);
  assert(spent === 2400, `spent=${spent}`);
  const remaining = Number(group.budget) - spent;
  assert(remaining === 47600, `remaining=${remaining}`);
});

await step('edit expense amount to 3000 recalculates split', async () => {
  const r = await req('PUT', `/expenses/${expense.id}`, {
    token: tokenA,
    body: {
      description: 'Dinner updated',
      original_amount: '3000',
      original_currency: 'INR',
      paid_by: { [String(userA.id)]: '3000' },
      split_type: 'equal',
      split_among: [userA.id, userB.id, userC.id],
      category: 'Food & Drink',
      date: todayISO(),
      actor_user_id: userA.id,
    },
  });
  assert(r.ok, JSON.stringify(r.data));
  expense = r.data;
  assert(expense.description === 'Dinner updated', 'desc');
  assert(Number(expense.split_amounts[String(userB.id)]) === 1000, 'B share after edit');
  const bal = await req('GET', `/groups/${group.id}/balances`, { token: tokenA });
  const map = Object.fromEntries(bal.data.balances.map((b) => [b.user_id, Number(b.balance)]));
  assert(Math.abs(map[userA.id] - 2000) < 0.01, `A bal after edit ${map[userA.id]}`);
});

await step('add transport expense 1500', async () => {
  const r = await req('POST', `/groups/${group.id}/expenses`, {
    token: tokenA,
    body: {
      description: 'Taxi',
      original_amount: '1500',
      original_currency: 'INR',
      paid_by: { [String(userB.id)]: '1500' },
      split_type: 'equal',
      split_among: [userA.id, userB.id, userC.id],
      category: 'Transport',
      date: todayISO(),
      actor_user_id: userA.id,
    },
  });
  assert(r.ok, JSON.stringify(r.data));
  const list = await req('GET', `/groups/${group.id}/expenses`, { token: tokenA });
  const spent = list.data.filter((e) => !e.deleted).reduce((s, e) => s + Number(e.total_amount), 0);
  assert(spent === 4500, `spent after taxi=${spent}`);
});

await step('review candidates = uncategorized only', async () => {
  const unc = await req('POST', `/groups/${group.id}/expenses`, {
    token: tokenA,
    body: {
      description: 'Misc',
      original_amount: '300',
      original_currency: 'INR',
      paid_by: { [String(userA.id)]: '300' },
      split_type: 'equal',
      split_among: [userA.id, userB.id],
      category: null,
      date: todayISO(),
      actor_user_id: userA.id,
    },
  });
  assert(unc.ok, JSON.stringify(unc.data));
  const list = await req('GET', `/groups/${group.id}/expenses`, { token: tokenA });
  const needs = list.data.filter((e) => !e.deleted && (!e.category || !String(e.category).trim()));
  assert(needs.some((e) => e.id === unc.data.id), 'uncategorized not found');
  assert(
    !needs.some((e) => e.category === 'Food & Drink'),
    'categorized expense wrongly needs review',
  );
});

await step('settlement plan + record payment', async () => {
  const plan = await req('GET', `/groups/${group.id}/settlement`, { token: tokenA });
  assert(plan.ok, JSON.stringify(plan.data));
  assert(Array.isArray(plan.data.settlements), 'no settlements array');
  if (plan.data.settlements.length === 0) {
    throw new Error('expected settlements with outstanding balances');
  }
  const item = plan.data.settlements[0];
  const pay = await req('POST', `/groups/${group.id}/payments`, {
    token: tokenA,
    body: {
      from_user_id: item.from_user_id,
      to_user_id: item.to_user_id,
      amount: item.amount,
      currency: item.currency || 'INR',
      date: todayISO(),
      actor_user_id: userA.id,
    },
  });
  assert(pay.ok, JSON.stringify(pay.data));
  const plan2 = await req('GET', `/groups/${group.id}/settlement`, { token: tokenA });
  assert(plan2.ok, 'settlement after pay failed');
});

await step('soft-delete expense', async () => {
  const list0 = await req('GET', `/groups/${group.id}/expenses`, { token: tokenA });
  const target = list0.data.find((e) => e.description === 'Misc');
  assert(target, 'misc expense missing');
  const del = await req('DELETE', `/expenses/${target.id}?actor_user_id=${userA.id}`, {
    token: tokenA,
  });
  assert(del.ok || del.status === 204, `delete status ${del.status}`);
  const list1 = await req('GET', `/groups/${group.id}/expenses`, { token: tokenA });
  assert(!list1.data.some((e) => e.id === target.id), 'deleted expense still listed');
});

await step('activity returns timestamps', async () => {
  const r = await req('GET', `/users/${userA.id}/activity?limit=50`, { token: tokenA });
  assert(r.ok && r.data.length > 0, 'no activity');
  assert(r.data.every((a) => typeof a.created_at === 'string'), 'missing created_at');
});

await step('clear budget', async () => {
  const r = await req('PUT', `/groups/${group.id}`, {
    token: tokenA,
    body: { clear_budget: true, clear_category_budgets: true },
  });
  assert(r.ok, JSON.stringify(r.data));
  assert(r.data.budget == null, 'budget not cleared');
});

await step('B cannot access protected groups without auth', async () => {
  const r = await req('GET', `/groups/${group.id}`);
  assert(r.status === 401, `expected 401 got ${r.status}`);
});

console.log('\n══════════════════════════════════');
console.log(`API E2E: ${pass} passed, ${fail} failed, ${pass + fail} total`);
if (fail) {
  for (const r of results.filter((x) => x.status === 'FAIL')) {
    console.log(`  FAIL: ${r.name} — ${r.error}`);
  }
  process.exit(1);
}
console.log('All API E2E regression checks passed.');
console.log(JSON.stringify({ emailA: userA.email, password, groupId: group.id }, null, 2));
