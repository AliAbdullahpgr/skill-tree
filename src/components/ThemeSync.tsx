'use client';
import { useEffect } from 'react';
import { STORAGE_KEY } from '@/lib/progression';

// Pages outside the board (such as the 404) apply the theme saved with progress.
export default function ThemeSync({ target }: { target: string }) {
  useEffect(() => {
    try {
      const theme = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').theme;
      if (theme === 'moonstone') document.querySelector(target)?.classList.add('theme-moonstone');
    } catch { /* The default theme is fine when storage is unavailable. */ }
  }, [target]);
  return null;
}
