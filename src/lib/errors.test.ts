import { describe, it, expect } from 'vitest';
import { AppError } from './errors';
import type { AppErrorCode, ActionResult } from './errors';

describe('AppError', () => {
  it('should be instanceof Error', () => {
    const err = new AppError('NOT_FOUND', '책을 찾을 수 없습니다');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('should set name to AppError', () => {
    const err = new AppError('NOT_FOUND', '책을 찾을 수 없습니다');
    expect(err.name).toBe('AppError');
  });

  it('should expose code and message', () => {
    const err = new AppError('VALIDATION_FAILED', '입력이 올바르지 않습니다');
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.message).toBe('입력이 올바르지 않습니다');
  });

  it('should accept optional cause', () => {
    const cause = new Error('original');
    const err = new AppError('UPSTREAM_FAILED', '외부 API 오류', cause);
    expect(err.cause).toBe(cause);
  });

  it('should accept optional fieldErrors', () => {
    const fieldErrors = { title: '제목을 입력해 주세요', body: '내용을 입력해 주세요' };
    const err = new AppError('VALIDATION_FAILED', '입력 오류', undefined, fieldErrors);
    expect(err.fieldErrors).toEqual(fieldErrors);
  });

  it('should support all error codes without TypeScript error', () => {
    const codes: AppErrorCode[] = [
      'VALIDATION_FAILED',
      'NOT_FOUND',
      'DUPLICATE_ISBN',
      'UPSTREAM_FAILED',
      'RATE_LIMITED',
      'UNAUTHORIZED',
      'UNSUPPORTED_ENV',
      'EMAIL_TAKEN',
      'INVALID_CREDENTIALS',
      'WEAK_PASSWORD',
      'EMAIL_NOT_CONFIRMED',
    ];
    codes.forEach((code) => {
      const err = new AppError(code, 'test');
      expect(err.code).toBe(code);
    });
  });

  it('should create EMAIL_TAKEN error correctly', () => {
    const err = new AppError('EMAIL_TAKEN', '이미 가입된 이메일이에요');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('EMAIL_TAKEN');
  });

  it('should create EMAIL_NOT_CONFIRMED error correctly', () => {
    const err = new AppError('EMAIL_NOT_CONFIRMED', '메일을 확인해 주세요');
    expect(err.code).toBe('EMAIL_NOT_CONFIRMED');
  });

  it('should create INVALID_CREDENTIALS error correctly', () => {
    const err = new AppError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 일치하지 않아요');
    expect(err.code).toBe('INVALID_CREDENTIALS');
  });

  it('should create WEAK_PASSWORD error correctly', () => {
    const err = new AppError('WEAK_PASSWORD', '비밀번호는 8자 이상이어야 해요');
    expect(err.code).toBe('WEAK_PASSWORD');
  });

  it('should create RATE_LIMITED error correctly', () => {
    const err = new AppError('RATE_LIMITED', '잠시 후 다시 시도해 주세요');
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.message).toBe('잠시 후 다시 시도해 주세요');
  });
});

describe('ActionResult', () => {
  it('should type-check ok result', () => {
    const result: ActionResult<{ id: string }> = { ok: true, data: { id: '1' } };
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('1');
    }
  });

  it('should type-check error result', () => {
    const result: ActionResult<{ id: string }> = {
      ok: false,
      error: { code: 'NOT_FOUND', message: '찾을 수 없습니다' },
    };
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('should include fieldErrors in error result', () => {
    const result: ActionResult<null> = {
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: '입력 오류',
        fieldErrors: { title: '필수 항목입니다' },
      },
    };
    if (!result.ok) {
      expect(result.error.fieldErrors?.['title']).toBe('필수 항목입니다');
    }
  });
});