import { describe, it, expect } from 'vitest';
import { computeGoal } from './goal';
import type { Book, ReadingSession } from '@/types';

const base: Book = {
  id: 'b1',
  title: '테스트 책',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

function session(endPage?: number): ReadingSession {
  return {
    id: 's1',
    bookId: 'b1',
    readDate: '2026-04-10',
    endPage,
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
  };
}

describe('computeGoal', () => {
  it('targetDate 없으면 status=none을 반환한다', () => {
    const result = computeGoal(base, []);
    expect(result.status).toBe('none');
    expect(result.pageProgress).toBeNull();
    expect(result.dateProgress).toBeNull();
    expect(result.remainingDays).toBeNull();
    expect(result.maxEndPage).toBeNull();
  });

  it('세션 없으면 maxEndPage=null, pageProgress=null', () => {
    const book = { ...base, targetDate: '2026-05-01', totalPages: 300 };
    const result = computeGoal(book, [], new Date('2026-04-15'));
    expect(result.maxEndPage).toBeNull();
    expect(result.pageProgress).toBeNull();
  });

  it('세션의 endPage 중 최대값을 maxEndPage로 반환한다', () => {
    const book = { ...base, targetDate: '2026-05-01', totalPages: 300 };
    const sessions = [session(50), session(120), session(80)];
    const result = computeGoal(book, sessions, new Date('2026-04-15'));
    expect(result.maxEndPage).toBe(120);
  });

  it('endPage 없는 세션은 maxEndPage 계산에서 제외된다', () => {
    const book = { ...base, targetDate: '2026-05-01', totalPages: 300 };
    const sessions = [session(undefined), session(50)];
    const result = computeGoal(book, sessions, new Date('2026-04-15'));
    expect(result.maxEndPage).toBe(50);
  });

  it('totalPages 없으면 pageProgress=null', () => {
    const book = { ...base, targetDate: '2026-05-01' }; // no totalPages
    const result = computeGoal(book, [session(100)], new Date('2026-04-15'));
    expect(result.pageProgress).toBeNull();
  });

  it('pageProgress는 1을 상한으로 clamp된다', () => {
    const book = { ...base, targetDate: '2026-05-01', totalPages: 100 };
    const result = computeGoal(book, [session(150)], new Date('2026-04-15'));
    expect(result.pageProgress).toBe(1);
  });

  it('on-track: pageProgress >= dateProgress', () => {
    // createdAt: 2026-04-01, targetDate: 2026-05-01 (30일)
    // today: 2026-04-16 (15일 경과) → dateProgress = 15/30 = 0.5
    // pageProgress = 180/300 = 0.6 → 0.6 >= 0.5 → on-track
    const book = { ...base, targetDate: '2026-05-01', totalPages: 300 };
    const result = computeGoal(book, [session(180)], new Date('2026-04-16'));
    expect(result.status).toBe('on-track');
    expect(result.pageProgress).toBeCloseTo(0.6);
    expect(result.dateProgress).toBeCloseTo(0.5);
  });

  it('behind: dateProgress - pageProgress >= 0.1', () => {
    // createdAt: 2026-04-01, targetDate: 2026-05-01 (30일)
    // today: 2026-04-16 (15일 경과) → dateProgress = 0.5
    // pageProgress = 90/300 = 0.3 → 0.5 - 0.3 = 0.2 >= 0.1 → behind
    const book = { ...base, targetDate: '2026-05-01', totalPages: 300 };
    const result = computeGoal(book, [session(90)], new Date('2026-04-16'));
    expect(result.status).toBe('behind');
  });

  it('overdue: 오늘이 targetDate 이후이고 pageProgress < 1', () => {
    // targetDate: 2026-04-10, today: 2026-04-20
    const book = { ...base, targetDate: '2026-04-10', totalPages: 300 };
    const result = computeGoal(book, [session(100)], new Date('2026-04-20'));
    expect(result.status).toBe('overdue');
  });

  it('overdue: pageProgress가 null이어도 targetDate 지나면 overdue', () => {
    // totalPages 없으므로 pageProgress=null
    const book = { ...base, targetDate: '2026-04-10' };
    const result = computeGoal(book, [], new Date('2026-04-20'));
    expect(result.status).toBe('overdue');
  });

  it('pageProgress=1이면 targetDate 지나도 overdue 아님', () => {
    const book = { ...base, targetDate: '2026-04-10', totalPages: 100 };
    const result = computeGoal(book, [session(100)], new Date('2026-04-20'));
    expect(result.status).toBe('on-track');
  });

  it('remainingDays: targetDate까지 남은 일수를 반환한다', () => {
    // today: 2026-04-16, targetDate: 2026-05-01 → 15일 남음
    const book = { ...base, targetDate: '2026-05-01' };
    const result = computeGoal(book, [], new Date('2026-04-16'));
    expect(result.remainingDays).toBe(15);
  });

  it('remainingDays: targetDate 당일은 0', () => {
    const book = { ...base, targetDate: '2026-04-16' };
    const result = computeGoal(book, [], new Date('2026-04-16'));
    expect(result.remainingDays).toBe(0);
  });

  it('remainingDays: 지난 날짜면 음수', () => {
    const book = { ...base, targetDate: '2026-04-10' };
    const result = computeGoal(book, [], new Date('2026-04-20'));
    expect(result.remainingDays).toBe(-10);
  });

  it('createdAt과 targetDate가 같으면 dateProgress=null(span=0)', () => {
    const book = { ...base, targetDate: '2026-04-01' };
    const result = computeGoal(book, [], new Date('2026-04-10'));
    expect(result.dateProgress).toBeNull();
  });

  it('pageProgress null이고 dateProgress 있어도 behind가 아닌 on-track 반환', () => {
    // totalPages 없어서 pageProgress=null, dateProgress=0.8
    const book = { ...base, targetDate: '2026-05-01' };
    const result = computeGoal(book, [session(100)], new Date('2026-04-25'));
    // 아직 overdue 아님, pageProgress null → behind 조건 불충족 → on-track
    expect(result.status).toBe('on-track');
    expect(result.pageProgress).toBeNull();
  });
});
