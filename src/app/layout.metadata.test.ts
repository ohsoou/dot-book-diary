import { vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }),
  }),
}))

const { metadata } = await import('./layout')

it('has openGraph image containing Bear.png', () => {
  expect(metadata.openGraph?.images).toBeDefined()
  const images = metadata.openGraph?.images
  const firstImage = Array.isArray(images) ? images[0] : images
  const src = typeof firstImage === 'string' ? firstImage : (firstImage as { url: string })?.url
  expect(src).toContain('Bear.png')
})
