import type { SetType, WorkoutExercise, WorkoutPlan } from '@/src/types/models';

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
  setType?: SetType;
  dropSetGroupId?: string;
  targetReps: number;
  targetWeightKg?: number;
  restSeconds: number;
  restAfterSeconds: number;
  targetRpe?: number;
  targetRir?: number;
  targetTempo?: string;
  setNotes?: string;
}

export function flattenWorkoutPlan(plan: WorkoutPlan): RunnerStep[] {
  const orderedSteps = buildOrderedSteps(plan);
  const steps = orderedSteps.map((step, idx) => {
    const next = orderedSteps[idx + 1];
    let restAfterSeconds = step.restSeconds;
    const sameSupersetRound =
      next &&
      step.supersetGroupId &&
      next.supersetGroupId === step.supersetGroupId &&
      step.setOrder === next.setOrder;
    if (sameSupersetRound) {
      restAfterSeconds = 0;
    }
    const linkedDropNext =
      next &&
      step.dropSetGroupId &&
      next.dropSetGroupId &&
      next.dropSetGroupId === step.dropSetGroupId &&
      next.exerciseId === step.exerciseId;
    if (linkedDropNext) {
      restAfterSeconds = 0;
    }
    return { ...step, restAfterSeconds };
  });

  const total = steps.length;
  return steps.map((step, index) => ({ ...step, index, total }));
}

export function getReadCoachText(step: RunnerStep, phase: 'set' | 'rest' | 'done', restLeft?: number): string {
  if (phase === 'done') {
    return 'Sessao concluida. Revise seus logs e finalize para salvar no historico.';
  }

  if (phase === 'rest') {
    return `Descanso: ${restLeft ?? step.restAfterSeconds}s. Prepare a proxima serie de ${step.exerciseName}.`;
  }

  const weightText = step.targetWeightKg != null ? ` com ${step.targetWeightKg} kg` : '';
  const supersetText = step.supersetGroupId ? ` (superset ${step.supersetGroupId})` : '';
  const setTypeText = step.setType ? ` [${labelSetType(step.setType)}]` : '';
  const intensityText =
    step.targetRpe != null
      ? ` RPE ${step.targetRpe}.`
      : step.targetRir != null
        ? ` RIR ${step.targetRir}.`
        : '';
  const tempoText = step.targetTempo ? ` Tempo ${step.targetTempo}.` : '';
  const noteText = step.setNotes ? ` Observacao: ${step.setNotes}.` : '';
  return `Serie ${step.setOrder}/${step.exerciseSetCount}${setTypeText} de ${step.exerciseName}${supersetText}: alvo de ${step.targetReps} reps${weightText}.${intensityText}${tempoText} Execute com controle.${noteText}`;
}

function buildOrderedSteps(plan: WorkoutPlan): Omit<RunnerStep, 'index' | 'total' | 'restAfterSeconds'>[] {
  const out: Omit<RunnerStep, 'index' | 'total' | 'restAfterSeconds'>[] = [];
  const exercises = [...plan.exercises].sort((a, b) => a.order - b.order);

  for (let i = 0; i < exercises.length; ) {
    const current = exercises[i];
    if (!current.supersetGroupId) {
      out.push(...exerciseToSteps(current));
      i += 1;
      continue;
    }

    const block: WorkoutExercise[] = [current];
    let j = i + 1;
    while (j < exercises.length && exercises[j].supersetGroupId === current.supersetGroupId) {
      block.push(exercises[j]);
      j += 1;
    }

    if (block.length === 1) {
      out.push(...exerciseToSteps(current));
      i += 1;
      continue;
    }

    const maxSets = Math.max(...block.map((ex) => ex.sets.length));
    for (let round = 1; round <= maxSets; round += 1) {
      for (const exercise of block) {
        const setItem = exercise.sets.find((set) => set.order === round);
        if (!setItem) {
          continue;
        }
        out.push(stepFrom(exercise, setItem));
      }
    }

    i = j;
  }

  return out;
}

function exerciseToSteps(exercise: WorkoutExercise): Omit<RunnerStep, 'index' | 'total' | 'restAfterSeconds'>[] {
  return [...exercise.sets]
    .sort((a, b) => a.order - b.order)
    .map((setItem) => stepFrom(exercise, setItem));
}

function stepFrom(
  exercise: WorkoutExercise,
  setItem: WorkoutExercise['sets'][number],
): Omit<RunnerStep, 'index' | 'total' | 'restAfterSeconds'> {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseNotes: exercise.notes,
    supersetGroupId: exercise.supersetGroupId,
    setId: setItem.id,
    setOrder: setItem.order,
    exerciseSetCount: exercise.sets.length,
    setType: setItem.setType,
    dropSetGroupId: setItem.dropSetGroupId,
    targetReps: setItem.targetReps,
    targetWeightKg: setItem.targetWeightKg,
    restSeconds: setItem.restSeconds,
    targetRpe: setItem.rpe,
    targetRir: setItem.rir,
    targetTempo: setItem.tempo,
    setNotes: setItem.notes,
  };
}

function labelSetType(value: SetType): string {
  switch (value) {
    case 'warmup':
      return 'aquecimento';
    case 'working':
      return 'trabalho';
    case 'drop':
      return 'drop';
    case 'failure':
      return 'falha';
    default:
      return value;
  }
}
