export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'DUPLICATE_ISBN'
  | 'UPSTREAM_FAILED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'UNSUPPORTED_ENV';

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public cause?: unknown,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AppErrorCode; message: string; fieldErrors?: Record<string, string> } };