import * as SQLite from 'expo-sqlite';

import { createDefaultAppData, type AppData } from '@/src/types/models';

const DB_NAME = 'pepe_mvp.db';
const APP_DATA_KEY = 'app_data_v1';

type KvRow = {
  key: string;
  value: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  const db = await dbPromise;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export async function loadAppData(): Promise<AppData> {
  const db = await getDb();
  const row = await db.getFirstAsync<KvRow>('SELECT key, value FROM app_kv WHERE key = ?', APP_DATA_KEY);

  if (!row) {
    return createDefaultAppData();
  }

  try {
    const parsed = JSON.parse(row.value) as AppData;
    return sanitizeAppData(parsed);
  } catch {
    return createDefaultAppData();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  const db = await getDb();
  const payload = JSON.stringify(data);
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO app_kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    APP_DATA_KEY,
    payload,
    now,
  );
}

function sanitizeAppData(input: Partial<AppData> | null | undefined): AppData {
  const base = createDefaultAppData();
  return {
    appDataVersion:
      typeof input?.appDataVersion === 'number' && Number.isFinite(input.appDataVersion)
        ? input.appDataVersion
        : base.appDataVersion,
    profile: {
      ...base.profile,
      ...(input?.profile ?? {}),
    },
    exerciseCatalog: Array.isArray(input?.exerciseCatalog) ? input.exerciseCatalog : base.exerciseCatalog,
    workoutPlans: Array.isArray(input?.workoutPlans) ? input.workoutPlans : [],
    sessions: Array.isArray(input?.sessions) ? input.sessions : [],
    imports: Array.isArray(input?.imports) ? input.imports : [],
    sessionDraft: input?.sessionDraft ?? undefined,
    settings: {
      ...base.settings,
      ...(input?.settings ?? {}),
      timer: {
        ...base.settings.timer,
        ...(input?.settings as Partial<AppData['settings']> | undefined)?.timer,
      },
      quickAdjust: {
        ...base.settings.quickAdjust,
        ...(input?.settings as Partial<AppData['settings']> | undefined)?.quickAdjust,
      },
      session: {
        ...base.settings.session,
        ...(input?.settings as Partial<AppData['settings']> | undefined)?.session,
      },
      coachTimelineFlags: {
        ...base.settings.coachTimelineFlags,
        ...(input?.settings as Partial<AppData['settings']> | undefined)?.coachTimelineFlags,
      },
      privacy: {
        ...base.settings.privacy,
        ...(input?.settings as Partial<AppData['settings']> | undefined)?.privacy,
      },
      featureFlags: {
        ...base.settings.featureFlags,
        ...(input?.settings as Partial<AppData['settings']> | undefined)?.featureFlags,
      },
    },
  };
}
