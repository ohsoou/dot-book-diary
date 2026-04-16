import { describe, it, expect, beforeEach } from 'vitest';

// next/headers 모킹
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

// @supabase/ssr 모킹
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn() },
  }),
  createBrowserClient: vi.fn(),
}));

// @/lib/supabase/server 모킹: getUser 동작을 테스트마다 제어한다
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

// RemoteStore 모킹: 생성자 호출 여부를 추적한다
vi.mock('./RemoteStore', () => ({
  RemoteStore: vi.fn().mockImplementation(() => ({ _type: 'remote' })),
}));

import { LocalStore } from './LocalStore';
import { RemoteStore } from './RemoteStore';

describe('getStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (RemoteStore as ReturnType<typeof vi.fn>).mockImplementation(() => ({ _type: 'remote' }));
  });

  it('세션이 있으면 RemoteStore를 반환한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const { getStore } = await import('./index');
    const store = await getStore();

    expect(RemoteStore).toHaveBeenCalledOnce();
    expect(store).toMatchObject({ _type: 'remote' });
  });

  it('세션이 없으면 LocalStore를 반환한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { getStore } = await import('./index');
    const store = await getStore();

    expect(store).toBeInstanceOf(LocalStore);
  });
});

describe('useStore', () => {
  it('항상 LocalStore를 반환한다 (클라이언트 비회원 경로)', async () => {
    const { useStore } = await import('./index');
    const store = useStore();
    expect(store).toBeInstanceOf(LocalStore);
  });
});