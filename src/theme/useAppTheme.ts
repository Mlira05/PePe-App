import { useMemo } from 'react';

import { useAppStore } from '@/src/state/AppStore';
import type { ColorMode } from '@/src/types/models';

export interface AppTheme {
  mode: ColorMode;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    danger: string;
    warningBg: string;
    warningBorder: string;
    warningText: string;
    inputBg: string;
    tabBg: string;
    tabInactive: string;
  };
}

export function useAppTheme(): AppTheme {
  const {
    data: { settings },
  } = useAppStore();

  return useMemo(() => {
    const mode = settings.colorMode;
    const colors =
      mode === 'light'
        ? {
            background: '#f6f3ff',
            surface: '#ffffff',
            surfaceAlt: '#f3edff',
            border: '#ddd6fe',
            borderStrong: '#c4b5fd',
            text: '#1f1633',
            textMuted: '#5b4f75',
            accent: '#a78bfa',
            accentSoft: '#ede9fe',
            accentText: '#25153b',
            danger: '#dc2626',
            warningBg: '#fff7ed',
            warningBorder: '#fdba74',
            warningText: '#9a3412',
            inputBg: '#ffffff',
            tabBg: '#ffffff',
            tabInactive: '#7c6f99',
          }
        : {
            background: '#0f0b1a',
            surface: '#191226',
            surfaceAlt: '#211733',
            border: '#35284f',
            borderStrong: '#6d4fd6',
            text: '#f5f0ff',
            textMuted: '#c5b8e6',
            accent: '#c4b5fd',
            accentSoft: '#2c2141',
            accentText: '#f7f3ff',
            danger: '#ef4444',
            warningBg: '#2b200b',
            warningBorder: '#a16207',
            warningText: '#fde68a',
            inputBg: '#151021',
            tabBg: '#140f20',
            tabInactive: '#9e90bf',
          };

    return { mode, colors };
  }, [settings.colorMode]);
}
