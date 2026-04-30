import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockExchangeCodeForSession = vi.fn()
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}))

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    NextResponse: { redirect: vi.fn((url: URL) => ({ status: 302, location: String(url) })) },
  }
})

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/auth/callback')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('code가 없으면 /login?error=link_expired로 redirect한다', async () => {
    const { GET } = await import('./route')
    const { NextResponse } = await import('next/server')

    await GET(makeRequest())

    const redirectedUrl = String((NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])
    expect(redirectedUrl).toContain('/login?error=link_expired')
  })

  it('code 교환 실패 시 /login?error=link_expired로 redirect한다', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid or expired code' } })

    const { GET } = await import('./route')
    const { NextResponse } = await import('next/server')

    await GET(makeRequest({ code: 'invalid-code' }))

    const redirectedUrl = String((NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])
    expect(redirectedUrl).toContain('/login?error=link_expired')
  })

  it('성공 시 user_metadata.nickname이 있으면 profiles upsert에 nickname이 포함된다', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: { nickname: '테스트닉네임' } } },
    })

    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ upsert: mockUpsert })

    const { GET } = await import('./route')
    const { NextResponse } = await import('next/server')

    await GET(makeRequest({ code: 'valid-code' }))

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code')
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'user-1', nickname: '테스트닉네임' },
      { onConflict: 'user_id' },
    )
    const redirectedUrl = String((NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])
    expect(redirectedUrl).toMatch(/^http.+\/$/)
  })

  it("성공 시 user_metadata.nickname이 없으면 profiles upsert에 '책곰이'가 포함된다", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
    })

    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ upsert: mockUpsert })

    const { GET } = await import('./route')

    await GET(makeRequest({ code: 'valid-code' }))

    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'user-1', nickname: '책곰이' },
      { onConflict: 'user_id' },
    )
  })

  it('profile upsert 실패 시 /login?error=profile_setup_failed로 redirect한다', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
    })

    const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    mockFrom.mockReturnValue({ upsert: mockUpsert })

    const { GET } = await import('./route')
    const { NextResponse } = await import('next/server')

    await GET(makeRequest({ code: 'valid-code' }))

    const redirectedUrl = String((NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])
    expect(redirectedUrl).toContain('/login?error=profile_setup_failed')
  })
})
