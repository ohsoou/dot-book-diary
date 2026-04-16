import { describe, it, expect } from 'vitest';
import { isValidIsbn13, convertIsbn10to13 } from './isbn';

describe('isValidIsbn13', () => {
  it('should return true for a valid ISBN-13', () => {
    // 9791163031567 - 실제 유효한 ISBN-13
    expect(isValidIsbn13('9791163031567')).toBe(true);
  });

  it('should return true for another valid ISBN-13', () => {
    // 9788966261840
    expect(isValidIsbn13('9788966261840')).toBe(true);
  });

  it('should return false for invalid check digit', () => {
    expect(isValidIsbn13('9791163031560')).toBe(false);
  });

  it('should return false for non-13-digit strings', () => {
    expect(isValidIsbn13('123456789012')).toBe(false); // 12자리
    expect(isValidIsbn13('12345678901234')).toBe(false); // 14자리
  });

  it('should return false for strings with non-digit characters', () => {
    expect(isValidIsbn13('97811630315AB')).toBe(false);
  });

  it('should strip hyphens before validation', () => {
    expect(isValidIsbn13('979-11-6303-156-7')).toBe(true);
  });
});

describe('convertIsbn10to13', () => {
  it('should convert a valid ISBN-10 to ISBN-13', () => {
    // 0-306-40615-2 → 9780306406157
    expect(convertIsbn10to13('0306406152')).toBe('9780306406157');
  });

  it('should handle ISBN-10 with X check digit', () => {
    // 013566098X → 9780135660980 (수학적으로 검증된 유효 ISBN-10, X 체크 디지트)
    expect(convertIsbn10to13('013566098X')).toBe('9780135660980');
  });

  it('should strip hyphens before conversion', () => {
    expect(convertIsbn10to13('0-306-40615-2')).toBe('9780306406157');
  });

  it('should return null for invalid ISBN-10', () => {
    expect(convertIsbn10to13('0306406153')).toBeNull(); // 잘못된 체크 디지트
  });

  it('should return null for wrong length', () => {
    expect(convertIsbn10to13('123456789')).toBeNull(); // 9자리
    expect(convertIsbn10to13('12345678901')).toBeNull(); // 11자리
  });

  it('should return null for non-numeric characters (except X at end)', () => {
    expect(convertIsbn10to13('030640615A')).toBeNull();
  });

  it('converted ISBN-13 should be valid', () => {
    const isbn13 = convertIsbn10to13('0306406152');
    expect(isbn13).not.toBeNull();
    expect(isValidIsbn13(isbn13!)).toBe(true);
  });
});