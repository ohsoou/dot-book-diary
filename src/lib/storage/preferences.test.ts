import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createStore, type UseStore } from 'idb-keyval';
import { getPreferences, updatePreferences, getDiaryDraft, setDiaryDraft, clearDiaryDraft } from './preferences';

let idbStore: UseStore;

beforeEach(() => {
  const idb = new IDBFactory();
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = idb;
  idbStore = createStore('dot-book-diary', 'kv');
});

describe('preferences', () => {
  it('getPreferences는 기본값(빈 객체)을 반환한다', async () => {
    const prefs = await getPreferences(idbStore);
    expect(prefs).toEqual({});
  });

  it('updatePreferences는 partial 업데이트를 지원한다', async () => {
    await updatePreferences({ nickname: '독서왕' }, idbStore);
    const prefs = await getPreferences(idbStore);
    expect(prefs.nickname).toBe('독서왕');
  });

  it('updatePreferences({ localArchived: true })가 반영된다', async () => {
    await updatePreferences({ localArchived: true }, idbStore);
    const prefs = await getPreferences(idbStore);
    expect(prefs.localArchived).toBe(true);
  });

  it('updatePreferences는 기존 필드를 유지한 채 병합한다', async () => {
    await updatePreferences({ nickname: '독서왕' }, idbStore);
    await updatePreferences({ guestBannerDismissed: true }, idbStore);
    const prefs = await getPreferences(idbStore);
    expect(prefs.nickname).toBe('독서왕');
    expect(prefs.guestBannerDismissed).toBe(true);
  });

  it('updatePreferences는 undefined 패치로 필드를 명시적으로 제거할 수 있다', async () => {
    await updatePreferences({ nickname: '독서왕' }, idbStore);
    await updatePreferences({ nickname: undefined }, idbStore);
    const prefs = await getPreferences(idbStore);
    expect(prefs.nickname).toBeUndefined();
  });
});

describe('diaryDraft', () => {
  it('getDiaryDraft는 존재하지 않으면 null을 반환한다', async () => {
    const draft = await getDiaryDraft('new', idbStore);
    expect(draft).toBeNull();
  });

  it("setDiaryDraft/getDiaryDraft는 'new' 키로 동작한다", async () => {
    const draft = { entryType: 'quote' as const, body: '임시 저장 내용' };
    await setDiaryDraft('new', draft, idbStore);
    const retrieved = await getDiaryDraft('new', idbStore);
    expect(retrieved).toEqual(draft);
  });

  it('setDiaryDraft/getDiaryDraft는 UUID 키로 동작한다', async () => {
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const draft = { entryType: 'review' as const, body: '리뷰 임시 저장', bookId: 'book-1' };
    await setDiaryDraft(uuid, draft, idbStore);
    const retrieved = await getDiaryDraft(uuid, idbStore);
    expect(retrieved).toEqual(draft);
  });

  it('clearDiaryDraft 후 getDiaryDraft는 null을 반환한다', async () => {
    await setDiaryDraft('new', { entryType: 'quote' as const, body: '내용' }, idbStore);
    await clearDiaryDraft('new', idbStore);
    const draft = await getDiaryDraft('new', idbStore);
    expect(draft).toBeNull();
  });

  it("서로 다른 키('new'와 UUID)는 독립적으로 관리된다", async () => {
    const uuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await setDiaryDraft('new', { entryType: 'quote' as const, body: 'new 드래프트' }, idbStore);
    await setDiaryDraft(uuid, { entryType: 'review' as const, body: 'UUID 드래프트' }, idbStore);
    expect((await getDiaryDraft('new', idbStore))?.body).toBe('new 드래프트');
    expect((await getDiaryDraft(uuid, idbStore))?.body).toBe('UUID 드래프트');
  });
});