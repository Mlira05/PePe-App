import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';

import { DEFAULT_APP_DATA, type AppData } from '@/src/types/models';

interface AppStoreValue {
  data: AppData;
  setData: (next: AppData) => void;
  patchData: (patch: Partial<AppData>) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(DEFAULT_APP_DATA);

  const value = useMemo<AppStoreValue>(
    () => ({
      data,
      setData,
      patchData: (patch) => setData((prev) => ({ ...prev, ...patch })),
    }),
    [data],
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
