import { describe, it, expect } from 'vitest';
import { resolveTheme } from './theme';

function makeDate(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

describe('resolveTheme', () => {
  it("'day' preference returns 'day' regardless of time", () => {
    expect(resolveTheme('day', makeDate(3))).toBe('day');
    expect(resolveTheme('day', makeDate(20))).toBe('day');
  });

  it("'night' preference returns 'night' regardless of time", () => {
    expect(resolveTheme('night', makeDate(10))).toBe('night');
    expect(resolveTheme('night', makeDate(20))).toBe('night');
  });

  it("'system' at 03:00 returns 'night'", () => {
    expect(resolveTheme('system', makeDate(3))).toBe('night');
  });

  it("'system' at 17:59 returns 'day'", () => {
    expect(resolveTheme('system', makeDate(17))).toBe('day');
  });

  it("'system' at 18:00 returns 'night'", () => {
    expect(resolveTheme('system', makeDate(18))).toBe('night');
  });

  it("'system' at 05:59 returns 'night'", () => {
    expect(resolveTheme('system', makeDate(5))).toBe('night');
  });

  it("'system' at 06:00 returns 'day'", () => {
    expect(resolveTheme('system', makeDate(6))).toBe('day');
  });
});
