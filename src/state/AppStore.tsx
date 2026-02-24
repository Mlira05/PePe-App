import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { loadAppData, saveAppData } from '@/src/db/appDataStore';
import { createDefaultAppData, type AppData, type Profile } from '@/src/types/models';

interface AppStoreValue {
  data: AppData;
  isReady: boolean;
  isSaving: boolean;
  setData: (next: AppData) => void;
  patchData: (patch: Partial<AppData>) => void;
  saveProfile: (profile: Profile) => Promise<void>;
  reload: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(createDefaultAppData);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const loaded = await loadAppData();
      if (cancelled) {
        return;
      }
      setData(loaded);
      setIsReady(true);
    }

    bootstrap().catch(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      setIsSaving(true);
      saveAppData(data)
        .catch(() => undefined)
        .finally(() => setIsSaving(false));
    }, 150);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [data, isReady]);

  const value = useMemo<AppStoreValue>(
    () => ({
      data,
      isReady,
      isSaving,
      setData,
      patchData: (patch) => setData((prev) => ({ ...prev, ...patch })),
      saveProfile: async (profile) => {
        setData((prev) => ({ ...prev, profile }));
        await saveAppData({ ...data, profile });
      },
      reload: async () => {
        const loaded = await loadAppData();
        setData(loaded);
      },
    }),
    [data, isReady, isSaving],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext);
  if (!value) {
    throw new Error('useAppStore must be used inside AppStoreProvider');
  }
  return value;
}
