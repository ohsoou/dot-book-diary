import { LocalStore } from './LocalStore';
import type { Store } from './Store';

export type { Store };

/**
 * 서버 경로(Server Component / Server Action / Route Handler)에서 사용.
 * Supabase 세션이 있으면 RemoteStore, 없으면 LocalStore(비회원 서버 셸 경로)를 반환한다.
 *
 * 비회원 서버 경로에서는 실제 LocalStore 메서드를 호출하지 않는다.
 * 데이터 읽기는 Client 컴포넌트에서 useStore()를 통해 수행한다.
 */
export async function getStore(): Promise<Store> {
  // server-only import를 동적으로 처리해 Client 번들에 포함되지 않도록 한다.
  const { createClient } = await import('@/lib/supabase/server');
  const { RemoteStore } = await import('./RemoteStore');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return new RemoteStore(supabase);
  }

  return new LocalStore();
}

/**
 * Client 컴포넌트에서 비회원 LocalStore에 접근할 때 사용.
 * 클라이언트 번들에서 server-only 모듈 체인을 피하려면
 * @/lib/storage/use-store 에서 직접 import 할 것.
 */
export { useStore } from './use-store';

export {
  getPreferences,
  updatePreferences,
  getDiaryDraft,
  setDiaryDraft,
  clearDiaryDraft,
} from './preferences';