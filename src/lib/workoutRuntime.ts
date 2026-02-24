import type { WorkoutPlan } from '@/src/types/models';

export interface RunnerStep {
  index: number;
  total: number;
  exerciseId: string;
  exerciseName: string;
  exerciseNotes?: string;
  supersetGroupId?: string;
  setId: string;
  setOrder: number;
  exerciseSetCount: number;
  targetReps: number;
  targetWeightKg?: number;
  restSeconds: number;
  setNotes?: string;
}

export function flattenWorkoutPlan(plan: WorkoutPlan): RunnerStep[] {
  const steps = plan.exercises.flatMap((exercise) =>
    exercise.sets.map((setItem) => ({
      index: 0,
      total: 0,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseNotes: exercise.notes,
      supersetGroupId: exercise.supersetGroupId,
      setId: setItem.id,
      setOrder: setItem.order,
      exerciseSetCount: exercise.sets.length,
      targetReps: setItem.targetReps,
      targetWeightKg: setItem.targetWeightKg,
      restSeconds: setItem.restSeconds,
      setNotes: setItem.notes,
    })),
  );

  const total = steps.length;
  return steps.map((step, index) => ({ ...step, index, total }));
}

export function getReadCoachText(step: RunnerStep, phase: 'set' | 'rest' | 'done', restLeft?: number): string {
  if (phase === 'done') {
    return 'Sessao concluida. Revise seus logs e finalize para salvar no historico.';
  }

  if (phase === 'rest') {
    return `Descanso: ${restLeft ?? step.restSeconds}s. Prepare a proxima serie de ${step.exerciseName}.`;
  }

  const weightText = step.targetWeightKg != null ? ` com ${step.targetWeightKg} kg` : '';
  const supersetText = step.supersetGroupId ? ` (superset ${step.supersetGroupId})` : '';
  const noteText = step.setNotes ? ` Observacao: ${step.setNotes}.` : '';
  return `Serie ${step.setOrder}/${step.exerciseSetCount} de ${step.exerciseName}${supersetText}: alvo de ${step.targetReps} reps${weightText}. Execute com controle.${noteText}`;
}
