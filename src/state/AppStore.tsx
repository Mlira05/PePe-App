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
import {
  createDefaultAppData,
  type AppData,
  type ImportRecord,
  type Profile,
  type WorkoutSession,
  type WorkoutPlan,
} from '@/src/types/models';

interface AppStoreValue {
  data: AppData;
  isReady: boolean;
  isSaving: boolean;
  setData: (next: AppData) => void;
  patchData: (patch: Partial<AppData>) => void;
  saveProfile: (profile: Profile) => Promise<void>;
  upsertWorkoutPlan: (plan: WorkoutPlan) => Promise<void>;
  deleteWorkoutPlan: (planId: string) => Promise<void>;
  importWorkoutPlans: (plans: WorkoutPlan[], importRecord: ImportRecord) => Promise<void>;
  addImportRecord: (record: ImportRecord) => Promise<void>;
  addSession: (session: WorkoutSession) => Promise<void>;
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
      upsertWorkoutPlan: async (plan) => {
        const existingIndex = data.workoutPlans.findIndex((item) => item.id === plan.id);
        const nextPlans = [...data.workoutPlans];
        if (existingIndex >= 0) {
          nextPlans[existingIndex] = plan;
        } else {
          nextPlans.push(plan);
        }
        nextPlans.sort((a, b) => a.dayLabel.localeCompare(b.dayLabel, 'pt-BR'));
        setData((prev) => ({ ...prev, workoutPlans: nextPlans }));
        await saveAppData({ ...data, workoutPlans: nextPlans });
      },
      deleteWorkoutPlan: async (planId) => {
        const nextPlans = data.workoutPlans.filter((item) => item.id !== planId);
        setData((prev) => ({ ...prev, workoutPlans: nextPlans }));
        await saveAppData({ ...data, workoutPlans: nextPlans });
      },
      importWorkoutPlans: async (plans, importRecord) => {
        const nextPlans = [...data.workoutPlans, ...plans].sort((a, b) =>
          a.dayLabel.localeCompare(b.dayLabel, 'pt-BR'),
        );
        const nextImports = [importRecord, ...data.imports];
        const nextData = { ...data, workoutPlans: nextPlans, imports: nextImports };
        setData(nextData);
        await saveAppData(nextData);
      },
      addImportRecord: async (record) => {
        const nextData = { ...data, imports: [record, ...data.imports] };
        setData(nextData);
        await saveAppData(nextData);
      },
      addSession: async (session) => {
        const nextSessions = [session, ...data.sessions];
        const nextData = { ...data, sessions: nextSessions };
        setData(nextData);
        await saveAppData(nextData);
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
