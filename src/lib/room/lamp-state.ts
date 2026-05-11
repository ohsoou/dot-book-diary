export type LampState = 'on' | 'off';
export const LAMP_STATE_KEY = 'dbd:lamp_state';

export function readLampState(): LampState {
  if (typeof window === 'undefined') return 'on';
  try {
    const raw = localStorage.getItem(LAMP_STATE_KEY);
    if (raw === 'on' || raw === 'off') return raw;
    return 'on';
  } catch {
    return 'on';
  }
}

export function writeLampState(state: LampState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAMP_STATE_KEY, state);
  } catch {
    // private 브라우징/쿠키 차단 환경 — 무시
  }
}
