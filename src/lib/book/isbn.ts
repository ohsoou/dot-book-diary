/**
 * ISBN-13 유효성 검사.
 * 13자리 숫자이며 체크 디지트가 올바른 경우 true.
 */
export function isValidIsbn13(isbn: string): boolean {
  const digits = isbn.replace(/[-\s]/g, '');
  if (!/^\d{13}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(digits[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(digits[12]);
}

/**
 * ISBN-10을 ISBN-13(978 접두사)으로 변환.
 * 유효하지 않은 ISBN-10이면 null 반환.
 */
export function convertIsbn10to13(isbn10: string): string | null {
  const digits = isbn10.replace(/[-\s]/g, '');
  if (!/^\d{9}[\dX]$/.test(digits)) return null;

  // ISBN-10 체크 디지트 검증
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  const lastChar = digits[9]!;
  const check10 = lastChar === 'X' ? 10 : Number(lastChar);
  sum += check10;
  if (sum % 11 !== 0) return null;

  // ISBN-13 생성: "978" + 앞 9자리 + 새 체크 디지트
  const base = '978' + digits.slice(0, 9);
  let sum13 = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(base[i]);
    sum13 += i % 2 === 0 ? d : d * 3;
  }
  const checkDigit13 = (10 - (sum13 % 10)) % 10;
  return base + String(checkDigit13);
}