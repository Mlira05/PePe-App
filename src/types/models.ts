import { createSeedExerciseCatalog } from '@/src/lib/exerciseCatalog';

export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado';
export type SedentaryLevel = 'baixo' | 'medio' | 'alto';
export type ColorMode = 'dark' | 'light';
export type AppLanguage = 'pt-BR' | 'en';
export type SetType = 'warmup' | 'working' | 'drop' | 'failure';
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'glutes'
  | 'core'
  | 'full_body'
  | 'other';
export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';
export type ExerciseKind = 'compound' | 'isolation' | 'other';

export interface Profile {
  name: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  experienceLevel: ExperienceLevel;
  sedentaryLevel: SedentaryLevel;
  goals: string;
}

export interface ExerciseSet {
  id: string;
  order: number;
  targetReps: number;
  targetWeightKg?: number;
  restSeconds: number;
  setType?: SetType;
  dropSetGroupId?: string;
  rpe?: number;
  rir?: number;
  tempo?: string;
  notes?: string;
  tagsJson?: Record<string, string | number | boolean>;
}

export interface ExerciseMetadata {
  primaryMuscleGroup?: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment?: EquipmentType;
  type?: ExerciseKind;
}

export interface ExerciseCatalogItem {
  id: string;
  name: string;
  metadata?: ExerciseMetadata;
  isFavorite: boolean;
  isUserCreated: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutExercise {
  id: string;
  order: number;
  name: string;
  catalogExerciseId?: string;
  isFavorite?: boolean;
  metadata?: ExerciseMetadata;
  notes?: string;
  supersetGroupId?: string;
  sets: ExerciseSet[];
}

export interface WorkoutPlan {
  id: string;
  dayLabel: string;
  notes?: string;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionSetLog {
  exerciseId: string;
  exerciseName: string;
  setId: string;
  setOrder: number;
  setType?: SetType;
  targetReps: number;
  targetWeightKg?: number;
  targetRpe?: number;
  targetRir?: number;
  targetTempo?: string;
  actualReps?: number;
  actualWeightKg?: number;
  actualRpe?: number;
  actualRir?: number;
  actualTempo?: string;
  notes?: string;
  completedAt?: string;
}

export type SessionDraftPhase = 'set_ready' | 'set_active' | 'after_set' | 'rest' | 'done';

export interface SessionDraft {
  id: string;
  workoutPlanId: string;
  workoutPlanLabel: string;
  startedAt: string;
  stepIndex: number;
  phase: SessionDraftPhase;
  restRemaining: number;
  actualRepsInput: string;
  actualWeightInput: string;
  actualRpeInput: string;
  actualRirInput: string;
  actualTempoInput: string;
  notesInput: string;
  setElapsedSeconds: number;
  setLogs: SessionSetLog[];
  voiceMuted: boolean;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  workoutPlanId: string;
  workoutPlanLabel: string;
  startedAt: string;
  endedAt?: string;
  setLogs: SessionSetLog[];
}

export type ImportSource = 'csv' | 'xlsx' | 'pdf' | 'googleSheets';

export interface ImportRecord {
  id: string;
  source: ImportSource;
  filename?: string;
  uri?: string;
  googleSheetsUrl?: string;
  status: 'completed' | 'stub_todo' | 'error';
  summary: string;
  createdAt: string;
  metadataJson?: Record<string, string | number | boolean>;
}

export interface AppSettings {
  colorMode: ColorMode;
  language: AppLanguage;
  timer: {
    autoStartRestAfterSet: boolean;
    warn10Seconds: boolean;
    soundsEnabled: boolean;
    hapticsEnabled: boolean;
  };
  quickAdjust: {
    weightStepSmallKg: number;
    weightStepLargeKg: number;
    repStep: number;
  };
  session: {
    showAdvancedSetFields: boolean;
  };
  coachTimelineFlags: {
    enabledV2Templates: boolean;
    enabledSpeechEngineAbstraction: boolean;
    encouragementCadence: 'per_set' | 'per_exercise';
    deterministicVariation: boolean;
  };
  privacy: {
    disclaimerAcceptedAt?: string;
    exportPrivacyWarningSeenAt?: string;
  };
  featureFlags: {
    improvedImportMapping: boolean;
    speechEngineAbstraction: boolean;
    coachTimelineTemplates: boolean;
    scheduleCalendar: boolean;
  };
}

export interface AppData {
  appDataVersion: number;
  profile: Profile;
  exerciseCatalog: ExerciseCatalogItem[];
  workoutPlans: WorkoutPlan[];
  sessions: WorkoutSession[];
  imports: ImportRecord[];
  sessionDraft?: SessionDraft;
  settings: AppSettings;
}

export function createDefaultProfile(): Profile {
  return {
    name: '',
    experienceLevel: 'iniciante',
    sedentaryLevel: 'medio',
    goals: '',
  };
}

export function createDefaultAppData(): AppData {
  return {
    appDataVersion: 3,
    profile: createDefaultProfile(),
    exerciseCatalog: createSeedExerciseCatalog(),
    workoutPlans: [],
    sessions: [],
    imports: [],
    sessionDraft: undefined,
    settings: {
      colorMode: 'dark',
      language: 'pt-BR',
      timer: {
        autoStartRestAfterSet: true,
        warn10Seconds: true,
        soundsEnabled: false,
        hapticsEnabled: true,
      },
      quickAdjust: {
        weightStepSmallKg: 2.5,
        weightStepLargeKg: 5,
        repStep: 1,
      },
      session: {
        showAdvancedSetFields: false,
      },
      coachTimelineFlags: {
        enabledV2Templates: false,
        enabledSpeechEngineAbstraction: false,
        encouragementCadence: 'per_set',
        deterministicVariation: true,
      },
      privacy: {},
      featureFlags: {
        improvedImportMapping: false,
        speechEngineAbstraction: false,
        coachTimelineTemplates: false,
        scheduleCalendar: false,
      },
    },
  };
}

export const DEFAULT_PROFILE: Profile = createDefaultProfile();
export const DEFAULT_APP_DATA: AppData = createDefaultAppData();
