const BASE = '/api'

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || JSON.stringify(err))
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Users
  loginByEmail: (email) => req('POST', '/users/login', { email }),
  createUser: (name, email) => req('POST', '/users', { name, email }),
  getUser: (id) => req('GET', `/users/${id}`),
  getUserSummary: (id) => req('GET', `/users/${id}/summary`),
  getUserActivity: (id) => req('GET', `/users/${id}/activity`),

  // Groups
  getGroups: (userId) => req('GET', `/groups${userId ? `?user_id=${userId}` : ''}`),
  createGroup: (data) => req('POST', '/groups', data),
  getGroup: (id) => req('GET', `/groups/${id}`),
  updateGroup: (id, data) => req('PUT', `/groups/${id}`, data),
  addMember: (groupId, userId) => req('POST', `/groups/${groupId}/members`, { user_id: userId }),
  removeMember: (groupId, userId) => req('DELETE', `/groups/${groupId}/members/${userId}`),

  // Expenses
  getExpenses: (groupId) => req('GET', `/groups/${groupId}/expenses`),
  createExpense: (groupId, data) => req('POST', `/groups/${groupId}/expenses`, data),
  getExpense: (id) => req('GET', `/expenses/${id}`),
  updateExpense: (id, data) => req('PUT', `/expenses/${id}`, data),
  deleteExpense: (id, actorId) =>
    req('DELETE', `/expenses/${id}${actorId ? `?actor_user_id=${actorId}` : ''}`),
  checkDuplicate: (groupId, params) =>
    req('GET', `/groups/${groupId}/expenses/check-duplicate?${new URLSearchParams(params)}`),
  createFriendExpense: (data) => req('POST', '/friend-expenses', data),
  getFriendExpenses: (userId) => req('GET', `/users/${userId}/friend-expenses`),

  // Payments
  getPayments: (groupId) => req('GET', `/groups/${groupId}/payments`),
  createPayment: (groupId, data) => req('POST', `/groups/${groupId}/payments`, data),

  // Balances
  getBalances: (groupId) => req('GET', `/groups/${groupId}/balances`),
  getSettlement: (groupId) => req('GET', `/groups/${groupId}/settlement`),

  // Activity
  getGroupActivity: (groupId) => req('GET', `/groups/${groupId}/activity`),

  // Invites
  createInvite: (groupId, actorUserId) =>
    req('POST', `/invite/groups/${groupId}/create?actor_user_id=${actorUserId}`),
  getInvite: (token) => req('GET', `/invite/${token}`),
  acceptInvite: (token, userId) => req('POST', `/invite/${token}/accept`, { user_id: userId }),
  deactivateInvite: (groupId, token) => req('DELETE', `/invite/groups/${groupId}/invite/${token}`),

  // Edit requests
  createEditRequest: (expenseId, data) => req('POST', `/expenses/${expenseId}/edit-request`, data),
  getEditRequests: (groupId, status) =>
    req('GET', `/groups/${groupId}/edit-requests${status ? `?status=${status}` : ''}`),
  reviewEditRequest: (id, data) => req('PUT', `/edit-requests/${id}/review`, data),

  // Test suite
  runTestSuite: (category) =>
    req('POST', `/test-suite/run${category ? `?category=${category}` : ''}`),
}
