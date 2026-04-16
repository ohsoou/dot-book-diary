import { get, set, del, createStore, type UseStore } from 'idb-keyval';
import type { GuestPreferences, DiaryDraft } from '@/types';
import { KEYS } from './keys';

function defaultStore(): UseStore {
  return createStore('dot-book-diary', 'kv');
}

// 기본 스토어 인스턴스 (싱글턴)
let _defaultStore: UseStore | null = null;
function getDefaultStore(): UseStore {
  if (!_defaultStore) _defaultStore = defaultStore();
  return _defaultStore;
}

export async function getPreferences(idbStore?: UseStore): Promise<GuestPreferences> {
  const store = idbStore ?? getDefaultStore();
  return (await get<GuestPreferences>(KEYS.PREFERENCES, store)) ?? {};
}

export async function updatePreferences(patch: Partial<GuestPreferences>, idbStore?: UseStore): Promise<void> {
  const store = idbStore ?? getDefaultStore();
  const current = await getPreferences(store);
  await set(KEYS.PREFERENCES, { ...current, ...patch }, store);
}

export async function getDiaryDraft(id: string, idbStore?: UseStore): Promise<DiaryDraft | null> {
  const store = idbStore ?? getDefaultStore();
  return (await get<DiaryDraft>(KEYS.DIARY_DRAFT(id), store)) ?? null;
}

export async function setDiaryDraft(id: string, draft: DiaryDraft, idbStore?: UseStore): Promise<void> {
  const store = idbStore ?? getDefaultStore();
  await set(KEYS.DIARY_DRAFT(id), draft, store);
}

export async function clearDiaryDraft(id: string, idbStore?: UseStore): Promise<void> {
  const store = idbStore ?? getDefaultStore();
  await del(KEYS.DIARY_DRAFT(id), store);
}