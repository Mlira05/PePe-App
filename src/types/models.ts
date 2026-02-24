export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado';
export type SedentaryLevel = 'baixo' | 'medio' | 'alto';

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
  notes?: string;
  tagsJson?: Record<string, string | number | boolean>;
}

export interface WorkoutExercise {
  id: string;
  order: number;
  name: string;
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
  targetReps: number;
  targetWeightKg?: number;
  actualReps?: number;
  actualWeightKg?: number;
  completedAt?: string;
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

export interface AppData {
  profile: Profile;
  workoutPlans: WorkoutPlan[];
  sessions: WorkoutSession[];
  imports: ImportRecord[];
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
    profile: createDefaultProfile(),
    workoutPlans: [],
    sessions: [],
    imports: [],
  };
}

export const DEFAULT_PROFILE: Profile = createDefaultProfile();
export const DEFAULT_APP_DATA: AppData = createDefaultAppData();
