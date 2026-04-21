import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

const mockEq = vi.fn()
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
const mockFrom = vi.fn().mockReturnValue({
  update: mockUpdate,
  select: vi.fn().mockReturnValue({ eq: mockEq }),
})

const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

import { updateThemePreferenceAction } from './profile'
import { revalidatePath } from 'next/cache'

describe('updateThemePreferenceAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ update: mockUpdate, select: vi.fn().mockReturnValue({ eq: mockEq }) })
    mockUpdate.mockReturnValue({ eq: mockEq })
  })

  it('유효한 pref로 성공 시 ok:true를 반환한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockEq.mockResolvedValue({ error: null })

    const result = await updateThemePreferenceAction('day')

    expect(result.ok).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidatePath).toHaveBeenCalledWith('/settings')
  })

  it('night 값도 성공적으로 처리한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockEq.mockResolvedValue({ error: null })

    const result = await updateThemePreferenceAction('night')
    expect(result.ok).toBe(true)
  })

  it('system 값도 성공적으로 처리한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockEq.mockResolvedValue({ error: null })

    const result = await updateThemePreferenceAction('system')
    expect(result.ok).toBe(true)
  })

  it('올바르지 않은 pref 값이면 VALIDATION_FAILED를 반환한다', async () => {
    const result = await updateThemePreferenceAction('invalid')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILED')
    }
  })

  it('로그인되지 않은 경우 UNAUTHORIZED를 반환한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateThemePreferenceAction('day')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED')
    }
  })

  it('DB 업데이트 실패 시 UPSTREAM_FAILED를 반환한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockEq.mockResolvedValue({ error: new Error('db error') })

    const result = await updateThemePreferenceAction('day')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILED')
    }
  })

  it('user_id = auth.uid() 조건으로 eq를 호출한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    mockEq.mockResolvedValue({ error: null })

    await updateThemePreferenceAction('day')

    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-abc')
  })
})
