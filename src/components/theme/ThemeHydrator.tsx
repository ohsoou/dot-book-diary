'use client';

import { useEffect } from 'react';
import { getPreferences } from '@/lib/storage/preferences';
import { resolveTheme } from '@/lib/theme';
import type { ThemePreference } from '@/lib/theme';

interface Props {
  themePreference?: ThemePreference;
}

export function ThemeHydrator({ themePreference }: Props) {
  useEffect(() => {
    let cancelled = false;

    async function applyTheme() {
      let pref: ThemePreference;
      if (themePreference !== undefined) {
        pref = themePreference;
      } else {
        const prefs = await getPreferences();
        if (cancelled) return;
        pref = prefs.themePreference ?? 'system';
      }
      document.documentElement.dataset.theme = resolveTheme(pref);
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
  }, [themePreference]);

  return null;
}
