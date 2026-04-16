import { describe, it, expect } from 'vitest';
import { formatLocalYmd, getMonthMatrix } from './date';

describe('formatLocalYmd', () => {
  it('should format a date to YYYY-MM-DD', () => {
    // 로컬 타임존 기준으로 new Date(year, month, day) 생성
    const date = new Date(2024, 0, 5); // 2024-01-05
    expect(formatLocalYmd(date)).toBe('2024-01-05');
  });

  it('should pad month and day with leading zeros', () => {
    const date = new Date(2024, 8, 3); // 2024-09-03
    expect(formatLocalYmd(date)).toBe('2024-09-03');
  });

  it('should handle December correctly', () => {
    const date = new Date(2023, 11, 31); // 2023-12-31
    expect(formatLocalYmd(date)).toBe('2023-12-31');
  });

  it('should handle January 1st', () => {
    const date = new Date(2026, 0, 1); // 2026-01-01
    expect(formatLocalYmd(date)).toBe('2026-01-01');
  });

  it('should return a string in lexicographically sortable order', () => {
    const earlier = formatLocalYmd(new Date(2024, 0, 1));
    const later = formatLocalYmd(new Date(2024, 5, 15));
    expect(earlier < later).toBe(true);
  });
});

describe('getMonthMatrix', () => {
  it('should return 6 rows of 7 days', () => {
    const matrix = getMonthMatrix(2026, 4); // April 2026
    expect(matrix).toHaveLength(6);
    matrix.forEach((row) => expect(row).toHaveLength(7));
  });

  it('should start on Sunday when weekStartsOn=0 (default)', () => {
    // April 2026: 1st is Wednesday (weekday 3)
    const matrix = getMonthMatrix(2026, 4, 0);
    // First cell should be Sunday March 29, 2026
    const firstCell = matrix[0]?.[0];
    expect(firstCell?.getDay()).toBe(0); // Sunday
  });

  it('should contain April 1 in the correct position', () => {
    // April 2026: April 1 is Wednesday = index 3 of the first row
    const matrix = getMonthMatrix(2026, 4, 0);
    const firstRow = matrix[0]!;
    const april1 = firstRow[3]!;
    expect(april1.getFullYear()).toBe(2026);
    expect(april1.getMonth()).toBe(3); // 0-based April
    expect(april1.getDate()).toBe(1);
  });

  it('should contain the last day of the month', () => {
    // April 2026 has 30 days
    const matrix = getMonthMatrix(2026, 4, 0);
    const allDates = matrix.flat();
    const aprilDates = allDates.filter((d) => d.getMonth() === 3 && d.getFullYear() === 2026);
    expect(aprilDates).toHaveLength(30);
    const lastApril = aprilDates[aprilDates.length - 1]!;
    expect(lastApril.getDate()).toBe(30);
  });

  it('should fill leading days from the previous month', () => {
    // April 2026 starts on Wednesday; with Sunday start, Mon/Tue/Wed are filled from March
    const matrix = getMonthMatrix(2026, 4, 0);
    const firstRow = matrix[0]!;
    // Cells 0,1,2 are March 29, 30, 31
    expect(firstRow[0]!.getMonth()).toBe(2); // March (0-based)
    expect(firstRow[0]!.getDate()).toBe(29);
    expect(firstRow[1]!.getDate()).toBe(30);
    expect(firstRow[2]!.getDate()).toBe(31);
  });

  it('should start on Monday when weekStartsOn=1', () => {
    const matrix = getMonthMatrix(2026, 4, 1);
    const firstCell = matrix[0]?.[0];
    expect(firstCell?.getDay()).toBe(1); // Monday
  });

  it('should handle months that start on Sunday with weekStartsOn=0', () => {
    // March 2026: 1st is Sunday
    const matrix = getMonthMatrix(2026, 3, 0);
    expect(matrix[0]?.[0]?.getMonth()).toBe(2); // March
    expect(matrix[0]?.[0]?.getDate()).toBe(1);
  });

  it('should produce 42 distinct consecutive days', () => {
    const matrix = getMonthMatrix(2026, 4, 0);
    const flat = matrix.flat();
    expect(flat).toHaveLength(42);
    for (let i = 1; i < flat.length; i++) {
      const prev = flat[i - 1]!;
      const curr = flat[i]!;
      const diff = curr.getTime() - prev.getTime();
      expect(diff).toBe(24 * 60 * 60 * 1000); // exactly 1 day apart
    }
  });
});