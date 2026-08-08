/**
 * Live auth contract test against the running backend.
 * Usage: node scripts/test-auth-api.mjs [baseUrl]
 * Default baseUrl: http://localhost:8000/api
 */

const BASE = (process.argv[2] || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const email = `mobile.auth.${Date.now()}@example.com`;
const password = 'testpass123';
const name = 'Mobile Auth Tester';

async function req(method, path, body, token) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`Testing auth against ${BASE}`);

  const health = await req('GET', '/health', undefined, null);
  // health may be /api/health
  const health2 = health.status === 404 ? await fetch(`${BASE.replace(/\/api$/, '')}/api/health`) : null;
  if (health.status !== 200 && health2) {
    const h = await health2.json();
    assert(h.status === 'ok', 'health failed');
  } else if (health.status === 200) {
    assert(health.data?.status === 'ok', 'health failed');
  }

  const badLogin = await req('POST', '/auth/login', {
    email,
    password: 'wrong',
  });
  assert(badLogin.status === 401, `expected 401 invalid login, got ${badLogin.status}`);
  assert(
    String(badLogin.data?.detail || '').toLowerCase().includes('invalid'),
    'invalid credentials message missing',
  );
  console.log('✓ invalid credentials → 401');

  const signup = await req('POST', '/auth/signup', { name, email, password });
  assert(signup.status === 201, `signup expected 201, got ${signup.status}: ${JSON.stringify(signup.data)}`);
  assert(signup.data?.token, 'signup missing token');
  assert(signup.data?.user?.email === email, 'signup email mismatch');
  console.log('✓ signup → token + user');

  const token = signup.data.token;
  const me = await req('GET', `/users/${signup.data.user.id}`, undefined, token);
  assert(me.status === 200, `get user expected 200, got ${me.status}`);
  assert(me.data?.id === signup.data.user.id, 'user id mismatch');
  console.log('✓ bearer token → GET /users/:id');

  const login = await req('POST', '/auth/login', { email, password });
  assert(login.status === 200, `login expected 200, got ${login.status}`);
  assert(login.data?.token, 'login missing token');
  console.log('✓ login → token');

  const expired = await req('GET', `/users/${signup.data.user.id}`, undefined, 'not.a.jwt');
  assert(expired.status === 401, `expected 401 bad token, got ${expired.status}`);
  console.log('✓ invalid/expired token → 401');

  const dup = await req('POST', '/auth/signup', { name, email, password });
  assert(dup.status === 400, `duplicate signup expected 400, got ${dup.status}`);
  console.log('✓ duplicate signup → 400');

  console.log('\nAll auth API checks passed.');
}

main().catch((err) => {
  console.error('\nAuth API test failed:', err.message);
  process.exit(1);
});
