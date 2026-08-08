#!/usr/bin/env node
const API = (process.env.API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const stamp = Date.now();
const email = `e2e_ui_${stamp}@test.com`;
const password = 'testpass123';
const name = 'E2E iOS User';

const res = await fetch(`${API}/auth/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ name, email, password }),
});
const data = await res.json();
if (!res.ok) {
  console.error(data);
  process.exit(1);
}
console.log(JSON.stringify({ email, password, name, userId: data.user.id, token: data.token }, null, 2));
