import type { SessionSetLog, WorkoutSession } from '@/src/types/models';

export interface WeeklyTrainingStat {
  weekKey: string;
  daysTrained: number;
}

export interface ExerciseVolumeStat {
  exerciseName: string;
  totalVolume: number;
}

export interface ExercisePrStat {
  exerciseName: string;
  maxWeightKg?: number;
  bestRepsAtWeight?: {
    weightKg: number;
    reps: number;
  };
}

export function getWeeklyTrainingStats(sessions: WorkoutSession[]): WeeklyTrainingStat[] {
  const perWeek = new Map<string, Set<string>>();
  sessions.forEach((session) => {
    const date = new Date(session.startedAt);
    const weekKey = getIsoWeekKey(date);
    const dayKey = date.toISOString().slice(0, 10);
    const set = perWeek.get(weekKey) ?? new Set<string>();
    set.add(dayKey);
    perWeek.set(weekKey, set);
  });

  return [...perWeek.entries()]
    .map(([weekKey, days]) => ({ weekKey, daysTrained: days.size }))
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

export function getExerciseVolumeStats(sessions: WorkoutSession[]): ExerciseVolumeStat[] {
  const totals = new Map<string, number>();
  sessions.forEach((session) => {
    session.setLogs.forEach((log) => {
      const reps = log.actualReps ?? log.targetReps;
      const weight = log.actualWeightKg ?? log.targetWeightKg ?? 0;
      const volume = reps * weight;
      if (!Number.isFinite(volume) || volume <= 0) {
        return;
      }
      totals.set(log.exerciseName, (totals.get(log.exerciseName) ?? 0) + volume);
    });
  });

  return [...totals.entries()]
    .map(([exerciseName, totalVolume]) => ({ exerciseName, totalVolume }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

export function getExercisePrStats(sessions: WorkoutSession[]): ExercisePrStat[] {
  const allLogs = sessions.flatMap((session) => session.setLogs);
  const groups = new Map<string, SessionSetLog[]>();

  allLogs.forEach((log) => {
    const bucket = groups.get(log.exerciseName) ?? [];
    bucket.push(log);
    groups.set(log.exerciseName, bucket);
  });

  return [...groups.entries()]
    .map(([exerciseName, logs]) => {
      let maxWeightKg: number | undefined;
      const bestRepsByWeight = new Map<number, number>();

      logs.forEach((log) => {
        const weight = log.actualWeightKg ?? log.targetWeightKg;
        const reps = log.actualReps ?? log.targetReps;
        if (typeof weight === 'number') {
          maxWeightKg = Math.max(maxWeightKg ?? 0, weight);
          if (Number.isFinite(reps)) {
            bestRepsByWeight.set(weight, Math.max(bestRepsByWeight.get(weight) ?? 0, reps));
          }
        }
      });

      const bestRepsAtWeight = [...bestRepsByWeight.entries()]
        .sort((a, b) => b[0] - a[0] || b[1] - a[1])[0];

      return {
        exerciseName,
        maxWeightKg,
        bestRepsAtWeight: bestRepsAtWeight
          ? { weightKg: bestRepsAtWeight[0], reps: bestRepsAtWeight[1] }
          : undefined,
      };
    })
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'pt-BR'));
}

function getIsoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
