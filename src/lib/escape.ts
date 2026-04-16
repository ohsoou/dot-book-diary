/**
 * HTML 특수문자를 이스케이프하여 XSS를 방어한다.
 * React는 JSX에서 자동으로 이스케이프하므로, dangerouslySetInnerHTML이나
 * 서버 사이드 HTML 생성에 사용한다.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}