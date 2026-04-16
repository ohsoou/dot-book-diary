/**
 * 로컬 타임존 기준으로 날짜를 YYYY-MM-DD 형식 문자열로 변환한다.
 * 외부 날짜 라이브러리(date-fns/dayjs/luxon) 사용 금지.
 */
export function formatLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 특정 연월의 캘린더 매트릭스를 반환한다.
 * 항상 6주 × 7일(42셀) 구조. 해당 월 앞뒤는 인접 월 날짜로 채운다.
 *
 * @param year - 연도
 * @param month - 월 (1-based, 1~12)
 * @param weekStartsOn - 주 시작 요일 (0=일요일, 1=월요일)
 * @returns 6×7 Date 배열
 */
export function getMonthMatrix(
  year: number,
  month: number,
  weekStartsOn = 0,
): Date[][] {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstDow = firstDayOfMonth.getDay(); // 0=Sun ... 6=Sat

  // 매트릭스 첫 번째 셀에 해당하는 날짜 계산
  const offset = (firstDow - weekStartsOn + 7) % 7;
  const start = new Date(year, month - 1, 1 - offset);

  const matrix: Date[][] = [];
  const cursor = new Date(start);

  for (let week = 0; week < 6; week++) {
    const row: Date[] = [];
    for (let day = 0; day < 7; day++) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    matrix.push(row);
  }

  return matrix;
}