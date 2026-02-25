import { useMemo } from 'react';

import { useAppStore } from '@/src/state/AppStore';

const STRINGS = {
  'pt-BR': {
    tabs: {
      plans: 'Treinos',
      imports: 'Importar',
      session: 'Sessao',
      analytics: 'Analytics',
    },
    settings: {
      title: 'Configs',
      subtitle: 'Preferencias locais, timers e privacidade',
      language: 'Idioma',
      languageHelp: 'Troca os textos do app entre portugues e ingles.',
      portuguese: 'Portugues',
      english: 'English',
      theme: 'Tema',
      darkDefault: 'Escuro (padrao)',
      light: 'Claro',
    },
    runner: {
      title: 'Sessao',
      subtitle: 'Rapido para usar na academia: texto + voz + draft local',
      muteVoice: 'Mutar Voz',
      unmuteVoice: 'Desmutar Voz',
      startSession: 'Iniciar Sessao',
      startSet: 'Iniciar Serie',
      completeSet: 'Concluir Serie',
      startRest: 'Iniciar Descanso',
      nextExercise: 'Proximo Exercicio',
      finishSave: 'Finalizar e Salvar Sessao',
      discardDraft: 'Descartar Rascunho',
      stopVoice: 'Parar Voz',
      showTimeline: 'Ver Timeline',
      hideTimeline: 'Ocultar Timeline',
    },
    common: {
      profile: 'Perfil',
      settings: 'Configs',
    },
  },
  en: {
    tabs: {
      plans: 'Workouts',
      imports: 'Import',
      session: 'Session',
      analytics: 'Analytics',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Local preferences, timers and privacy',
      language: 'Language',
      languageHelp: 'Switch app text between Portuguese and English.',
      portuguese: 'Portuguese',
      english: 'English',
      theme: 'Theme',
      darkDefault: 'Dark (default)',
      light: 'Light',
    },
    runner: {
      title: 'Session',
      subtitle: 'Fast gym flow: text + voice + local draft',
      muteVoice: 'Mute Voice',
      unmuteVoice: 'Unmute Voice',
      startSession: 'Start Session',
      startSet: 'Start Set',
      completeSet: 'Complete Set',
      startRest: 'Start Rest',
      nextExercise: 'Next Exercise',
      finishSave: 'Finish & Save Session',
      discardDraft: 'Discard Draft',
      stopVoice: 'Stop Voice',
      showTimeline: 'Show Timeline',
      hideTimeline: 'Hide Timeline',
    },
    common: {
      profile: 'Profile',
      settings: 'Settings',
    },
  },
} as const;

type StringTree = typeof STRINGS['pt-BR'];
type DeepKey<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object ? `${K}` | `${K}.${DeepKey<T[K]>}` : `${K}`;
    }[keyof T & string]
  : never;

function getValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? (acc as any)[key] : undefined), obj);
}

export function useI18n() {
  const {
    data: { settings },
  } = useAppStore();

  return useMemo(() => {
    const lang = settings.language ?? 'pt-BR';
    const dict = STRINGS[lang];
    const fallback = STRINGS['pt-BR'];

    return {
      lang,
      t: (key: DeepKey<StringTree>) => {
        const hit = getValue(dict, key);
        if (typeof hit === 'string') {
          return hit;
        }
        const fallbackHit = getValue(fallback, key);
        return typeof fallbackHit === 'string' ? fallbackHit : key;
      },
      isEnglish: lang === 'en',
    };
  }, [settings.language]);
}
