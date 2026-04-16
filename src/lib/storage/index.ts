import { LocalStore } from './LocalStore';
import type { Store } from './Store';

export type { Store };

// 현재는 항상 LocalStore(비회원) 반환. step 3에서 RemoteStore로 교체.
export function getStore(): Store {
  return new LocalStore();
}

// step 3에서 완성될 client hook stub
export function useStore(): Store {
  return getStore();
}

export {
  getPreferences,
  updatePreferences,
  getDiaryDraft,
  setDiaryDraft,
  clearDiaryDraft,
} from './preferences';