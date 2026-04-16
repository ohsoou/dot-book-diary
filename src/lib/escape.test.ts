import { describe, it, expect } from 'vitest';
import { escapeHtml } from './escape';

describe('escapeHtml', () => {
  it('should escape ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('should escape greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('should escape XSS payload', () => {
    const input = '<script>alert("xss")</script>';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should not modify plain text', () => {
    expect(escapeHtml('안녕하세요 독서 기록')).toBe('안녕하세요 독서 기록');
  });

  it('should escape all special characters in a combined string', () => {
    const input = `<div class="test" id='foo'>Hello & World</div>`;
    const result = escapeHtml(input);
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&quot;');
    expect(result).toContain('&#x27;');
    expect(result).toContain('&amp;');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('"');
    expect(result).not.toContain("'");
  });
});