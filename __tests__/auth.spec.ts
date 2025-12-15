// Unit tests for auth endpoints. Mocks Supabase and NextAuth JWT.

// Mock NextResponse to return simple object with status and json body
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({ status: init?.status || 200, body }),
  },
}))

// Mock rate limiter to always allow
jest.mock('@/lib/rateLimiter', () => ({ isRateLimited: () => false }))

describe('Auth API endpoints', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('create-user returns 400 when missing fields', async () => {
    const { POST } = await import('@/app/api/auth/create-user/route') as any
    const req: any = { json: async () => ({ email: '' }), headers: new Map() }
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  test('create-user returns 409 when email already exists', async () => {
    // Mock supabase to indicate existing
    jest.doMock('@/lib/supabase', () => ({
      getSupabase: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'x' } }) })
          })
        })
      })
    }))
    const { POST } = await import('@/app/api/auth/create-user/route') as any
    const req: any = { json: async () => ({ email: 'a@b.com', password: 'pass' }), headers: new Map() }
    const res = await POST(req)
    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('error')
  })

  test('create-user success returns ok', async () => {
    // Mock supabase insert flow
    jest.doMock('@/lib/supabase', () => ({
      getSupabase: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null }) })
          }),
          insert: () => ({ select: () => ({ single: async () => ({ data: { user_id: 'u1', username: 'u', email: 'a@b.com' } }) }) })
        })
      })
    }))
    const { POST } = await import('@/app/api/auth/create-user/route') as any
    const req: any = { json: async () => ({ email: 'a@b.com', password: 'pass', username: 'u' }), headers: new Map() }
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('ok', true)
    expect(res.body).toHaveProperty('user')
  })

  test('update-password returns 400 on missing fields', async () => {
    const { POST } = await import('@/app/api/auth/update-password/route') as any
    const req: any = { json: async () => ({}), headers: new Map() }
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('complete-profile returns 401 when no token', async () => {
    // Mock getToken to return null
    jest.doMock('next-auth/jwt', () => ({ getToken: async () => null }))
    const { POST } = await import('@/app/api/auth/complete-profile/route') as any
    const req: any = { json: async () => ({ username: 'u', password: 'p', dateOfBirth: '2000-01-01', gender: 'male' }), headers: new Map() }
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
