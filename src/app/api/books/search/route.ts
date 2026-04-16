import { NextRequest, NextResponse } from 'next/server';
import { searchByKeyword } from '@/lib/aladin';
import { AppError } from '@/lib/errors';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get('q') ?? '';

  if (!q.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: '검색어를 입력해 주세요' } },
      { status: 400 },
    );
  }

  if (q.length > 100) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: '검색어는 100자 이하로 입력해 주세요' } },
      { status: 400 },
    );
  }

  try {
    const data = await searchByKeyword(q);
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