import { z } from 'zod';
import { AppError } from './errors';
import { formatLocalYmd } from './date';

// ── 도메인 스키마 ────────────────────────────────────────────────────────────

export const bookSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, { message: '제목을 입력해 주세요' }).max(500, { message: '제목은 500자 이내로 입력해 주세요' }),
  author: z.string().max(300, { message: '저자는 300자 이내로 입력해 주세요' }).optional(),
  publisher: z.string().max(300, { message: '출판사는 300자 이내로 입력해 주세요' }).optional(),
  coverUrl: z.string().url({ message: '올바른 URL을 입력해 주세요' }).optional(),
  totalPages: z.number().int().min(1, { message: '총 페이지는 1 이상이어야 합니다' }).optional(),
});

export const readingSessionSchema = z
  .object({
    bookId: z.string().min(1, { message: '책 ID가 필요합니다' }),
    readDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'YYYY-MM-DD 형식으로 입력해 주세요' })
      .refine(
        (date) => date <= formatLocalYmd(new Date()),
        { message: '미래 날짜는 입력할 수 없습니다' },
      ),
    startPage: z.number().int().min(0, { message: '시작 페이지는 0 이상이어야 합니다' }).optional(),
    endPage: z.number().int().min(0, { message: '끝 페이지는 0 이상이어야 합니다' }).optional(),
    durationMinutes: z.number().int().min(0, { message: '독서 시간은 0 이상이어야 합니다' }).optional(),
  })
  .refine(
    ({ startPage, endPage }) => startPage == null || endPage == null || endPage >= startPage,
    { message: '끝 페이지는 시작 페이지 이상이어야 합니다', path: ['endPage'] },
  );

export const readingSessionWithTotalPagesSchema = (totalPages: number) =>
  readingSessionSchema.refine(
    ({ endPage }) => endPage == null || endPage <= totalPages,
    { message: `끝 페이지는 ${totalPages} 이하여야 합니다`, path: ['endPage'] },
  );

export const diaryEntrySchema = z.object({
  bookId: z.string().optional(),
  entryType: z.enum(['quote', 'review'], { message: "entryType은 'quote' 또는 'review'여야 합니다" }),
  body: z
    .string()
    .min(1, { message: '내용을 입력해 주세요' })
    .max(5000, { message: '내용은 5000자 이내로 입력해 주세요' })
    .refine((s) => s.trim().length >= 1, { message: '공백만으로는 저장할 수 없습니다' }),
  page: z.number().int().min(0, { message: '페이지는 0 이상이어야 합니다' }).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, { message: '검색어를 입력해 주세요' }).max(200, { message: '검색어는 200자 이내로 입력해 주세요' }).trim(),
});

export const profileSchema = z.object({
  nickname: z
    .string()
    .min(1, { message: '닉네임을 입력해 주세요' })
    .max(30, { message: '닉네임은 30자 이내로 입력해 주세요' })
    .trim(),
});

export const diaryDraftSchema = z.object({
  entryType: z.enum(['quote', 'review']),
  body: z.string().max(5000),
  bookId: z.string().optional(),
  page: z.number().int().min(0).optional(),
});

// ── 타입 추론 ────────────────────────────────────────────────────────────────

export type BookInput = z.infer<typeof bookSchema>;
export type ReadingSessionInput = z.infer<typeof readingSessionSchema>;
export type DiaryEntryInput = z.infer<typeof diaryEntrySchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type DiaryDraftInput = z.infer<typeof diaryDraftSchema>;

// ── 헬퍼: zod 에러 → AppError 변환 ─────────────────────────────────────────

/**
 * zod SafeParseReturnType의 에러를 AppError(VALIDATION_FAILED)로 변환한다.
 * SafeParseReturnType을 직접 쓰지 말고 이 헬퍼를 통해 변환한다.
 */
export function toValidationError(issues: z.ZodIssue[]): AppError {
  const fieldErrors: Record<string, string> = {};
  const messages: string[] = [];

  for (const issue of issues) {
    const field = issue.path.join('.');
    if (field) {
      fieldErrors[field] = issue.message;
    }
    messages.push(issue.message);
  }

  return new AppError(
    'VALIDATION_FAILED',
    messages[0] ?? '입력이 올바르지 않습니다',
    undefined,
    Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  );
}

/**
 * zod 스키마로 파싱하고, 실패 시 AppError를 throw한다.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw toValidationError(result.error.issues);
  }
  return result.data;
}