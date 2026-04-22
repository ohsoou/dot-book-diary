export type BearStateKind = 'fresh' | 'active' | 'sleeping';

export type BearAsset =
  | 'Bear.png'
  | 'Bear_drinking.png'
  | 'Bear_eating.png'
  | 'Bear_healing.png'
  | 'Bear_playing.png'
  | 'Bear_working.png'
  | 'Bear_sleeping.png';

export interface BearStateResult {
  state: BearStateKind;
  asset: BearAsset;
  label: string;
  elapsedMs: number | null;
}

const ACTIVE_VARIANTS: BearAsset[] = [
  'Bear_drinking.png',
  'Bear_eating.png',
  'Bear_healing.png',
  'Bear_playing.png',
  'Bear_working.png',
];

const ACTIVE_LABELS: Record<string, string> = {
  'Bear_drinking.png': '곰이 쉬고 있어요',
  'Bear_eating.png': '곰이 먹고 있어요',
  'Bear_healing.png': '곰이 쉬고 있어요',
  'Bear_playing.png': '곰이 놀고 있어요',
  'Bear_working.png': '곰이 일하고 있어요',
};

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeBearState(
  lastReadAt: string | null,
  opts: { now: Date; rng?: () => number },
): BearStateResult {
  const { now, rng } = opts;

  if (lastReadAt === null) {
    return { state: 'fresh', asset: 'Bear.png', label: '곰이 책을 기다려요', elapsedMs: null };
  }

  const parsed = new Date(lastReadAt);
  if (isNaN(parsed.getTime())) {
    return { state: 'fresh', asset: 'Bear.png', label: '곰이 책을 기다려요', elapsedMs: null };
  }

  const elapsedMs = now.getTime() - parsed.getTime();

  if (elapsedMs < 0) {
    return { state: 'fresh', asset: 'Bear.png', label: '곰이 책을 기다려요', elapsedMs };
  }

  if (elapsedMs < 3_600_000) {
    return { state: 'fresh', asset: 'Bear.png', label: '곰이 책을 읽고 왔어요', elapsedMs };
  }

  if (elapsedMs >= 604_800_000) {
    return { state: 'sleeping', asset: 'Bear_sleeping.png', label: '곰이 자고 있어요', elapsedMs };
  }

  const resolvedRng =
    rng ?? mulberry32(hashString(formatLocalDate(now) + lastReadAt));
  const index = Math.floor(resolvedRng() * ACTIVE_VARIANTS.length);
  const asset = ACTIVE_VARIANTS[index] ?? ACTIVE_VARIANTS[0]!;
  const label = ACTIVE_LABELS[asset] ?? '곰이 놀고 있어요';

  return { state: 'active', asset, label, elapsedMs };
}

export function formatElapsed(elapsedMs: number): string {
  if (elapsedMs < 60_000) return '방금';
  if (elapsedMs < 3_600_000) return `${Math.floor(elapsedMs / 60_000)}분 전`;
  if (elapsedMs < 86_400_000) return `${Math.floor(elapsedMs / 3_600_000)}시간 전`;
  if (elapsedMs < 604_800_000) return `${Math.floor(elapsedMs / 86_400_000)}일 전`;
  return `${Math.floor(elapsedMs / 604_800_000)}주 전`;
}
