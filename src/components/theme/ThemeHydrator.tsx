'use client';

import { useEffect } from 'react';
import { getPreferences } from '@/lib/storage/preferences';
import { resolveTheme } from '@/lib/theme';

export function ThemeHydrator() {
  useEffect(() => {
    let cancelled = false;

    async function applyTheme() {
      const prefs = await getPreferences();
      if (cancelled) return;
      const pref = prefs.themePreference ?? 'system';
      const theme = resolveTheme(pref);
      document.documentElement.dataset.theme = theme;
    }

    void applyTheme();

    // 'system' 선호 시 18:00/06:00 경계를 넘기면 재계산
    const interval = setInterval(() => {
      void applyTheme();
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}
