import { NextRequest, NextResponse } from 'next/server';
import { fetchByIsbn } from '@/lib/aladin';
import { AppError } from '@/lib/errors';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const isbn = request.nextUrl.searchParams.get('isbn') ?? '';

  if (!isbn.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'ISBN을 입력해 주세요' } },
      { status: 400 },
    );
  }

  try {
    const data = await fetchByIsbn(isbn);
    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '책을 찾을 수 없어요' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'RATE_LIMITED') {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 429 });
      }
      if (err.code === 'UPSTREAM_FAILED') {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 502 });
      }
    }
    return NextResponse.json({ error: { code: 'UPSTREAM_FAILED', message: '알 수 없는 오류가 발생했어요' } }, { status: 502 });
  }
}