export type ThemePreference = 'system' | 'day' | 'night';
export type Theme = 'day' | 'night';

export function resolveTheme(pref: ThemePreference, now?: Date): Theme {
  if (pref === 'day') return 'day';
  if (pref === 'night') return 'night';
  const h = (now ?? new Date()).getHours();
  return h >= 18 || h < 6 ? 'night' : 'day';
}
