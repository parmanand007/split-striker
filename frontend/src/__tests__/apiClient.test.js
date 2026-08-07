import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../api/client'

const mockFetch = vi.fn()
global.fetch = mockFetch

function mockResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('API client', () => {
  it('getGroups hits /groups with user_id query', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await api.getGroups(42)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('user_id=42'),
      expect.any(Object)
    )
  })

  it('getGroups without userId hits /groups', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await api.getGroups()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/groups'),
      expect.any(Object)
    )
  })

  it('createGroup posts body to /groups', async () => {
    const group = { id: 1, name: 'Trip', currency: 'INR', members: [] }
    mockFetch.mockResolvedValueOnce(mockResponse(group, 201))
    const result = await api.createGroup({ name: 'Trip', currency: 'INR' })
    expect(result.name).toBe('Trip')
  })

  it('authLogin posts to /auth/login', async () => {
    const payload = { token: 'jwt.token.here', user: { id: 1, name: 'Alice', email: 'a@test.com' } }
    mockFetch.mockResolvedValueOnce(mockResponse(payload))
    const result = await api.authLogin('a@test.com', 'secret')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.token).toBe('jwt.token.here')
  })

  it('authSignup posts name+email+password to /auth/signup', async () => {
    const payload = { token: 'jwt.token.here', user: { id: 1, name: 'Alice', email: 'a@test.com' } }
    mockFetch.mockResolvedValueOnce(mockResponse(payload, 201))
    const result = await api.authSignup('Alice', 'a@test.com', 'secret')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/signup'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.user.name).toBe('Alice')
  })

  it('getUser calls /users/:id', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 1 }))
    await api.getUser(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/1'),
      expect.any(Object)
    )
  })

  it('getExpenses calls /groups/:id/expenses', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await api.getExpenses(5)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/groups/5/expenses'),
      expect.any(Object)
    )
  })

  it('getBalances calls /groups/:id/balances', async () => {
    const bal = { balances: [], total_check: '0.00' }
    mockFetch.mockResolvedValueOnce(mockResponse(bal))
    const result = await api.getBalances(3)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/groups/3/balances'),
      expect.any(Object)
    )
    expect(result).toHaveProperty('balances')
  })

  it('getSettlement calls /groups/:id/settlement', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ settlements: [] }))
    await api.getSettlement(7)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/groups/7/settlement'),
      expect.any(Object)
    )
  })

  it('createPayment posts to /groups/:id/payments', async () => {
    const pay = { id: 1, from_user_id: 2, to_user_id: 1, amount: '50' }
    mockFetch.mockResolvedValueOnce(mockResponse(pay, 201))
    const result = await api.createPayment(1, { from_user_id: 2, to_user_id: 1, amount: '50' })
    expect(result).toMatchObject({ amount: '50' })
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Not found' }, 404))
    await expect(api.getUser(999)).rejects.toThrow()
  })

  it('createInvite calls /invite/groups/:id/create', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ token: 'abc123' }))
    await api.createInvite(5, 1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/invite/groups/5/create'),
      expect.any(Object)
    )
  })

  it('getInvite calls /invite/:token', async () => {
    const inv = { token: 'abc', group_id: 1, group_name: 'Trip' }
    mockFetch.mockResolvedValueOnce(mockResponse(inv))
    await api.getInvite('abc')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/invite/abc'),
      expect.any(Object)
    )
  })
})
