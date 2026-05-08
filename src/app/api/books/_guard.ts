import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { checkAndConsume } from '@/lib/rate-limit';

export type GuardConfig = {
  rate: number;
  per?: number;
  scope: string;
};

export type GuardResult =
  | { ok: true; clientKey: string }
  | { ok: false; response: NextResponse };

const LOCALHOST_ORIGINS = ['http://localhost:3000', 'https://localhost:3000'];

function getOriginFromRequest(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (origin) return origin;

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

function isAllowedOrigin(origin: string): boolean {
  if (LOCALHOST_ORIGINS.includes(origin)) return true;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const appOrigin = new URL(appUrl).origin;
      if (origin === appOrigin) return true;
    } catch {
      // invalid URL, skip
    }
  }

  return false;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'anonymous';
}

export function applyApiGuard(req: NextRequest, cfg: GuardConfig): GuardResult {
  const origin = getOriginFromRequest(req);

  if (!origin || !isAllowedOrigin(origin)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN', message: '허용되지 않은 출처입니다' } },
        { status: 403 },
      ),
    };
  }

  const ip = getClientIp(req);
  const key = `${cfg.scope}:${ip}`;

  const result = checkAndConsume(key, { rate: cfg.rate, per: cfg.per ?? 60_000 });

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요' } },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSec) },
        },
      ),
    };
  }

  return { ok: true, clientKey: key };
}
