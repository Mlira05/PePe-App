import type { RunnerStep } from '@/src/lib/workoutRuntime';

export type CoachCueType =
  | 'exercise_start'
  | 'set_start'
  | 'weight_reminder'
  | 'encouragement'
  | 'rest_start'
  | 'rest_10_left'
  | 'next_set';

export interface CoachTimelineCue {
  id: string;
  offsetSec: number;
  type: CoachCueType;
  textPtBr: string;
  stepIndex: number;
}

export interface CoachTimeline {
  version: 1;
  estimatedTotalSec: number;
  cues: CoachTimelineCue[];
}

export function buildCoachTimeline(steps: RunnerStep[]): CoachTimeline {
  const cues: CoachTimelineCue[] = [];
  let offsetSec = 0;
  let lastExerciseId: string | null = null;
  let lastWeight: number | undefined;

  steps.forEach((step, idx) => {
    const exerciseChanged = step.exerciseId !== lastExerciseId;

    if (exerciseChanged) {
      cues.push(
        cue(offsetSec, 'exercise_start', idx, `Começando ${step.exerciseName}. Prepare-se.`),
      );
      lastExerciseId = step.exerciseId;
      lastWeight = undefined;
    }

    const setLabel = `Série ${step.setOrder} de ${step.exerciseName}.`;
    cues.push(cue(offsetSec + 1, 'set_start', idx, setLabel));

    if (step.targetWeightKg != null && step.targetWeightKg !== lastWeight) {
      cues.push(
        cue(offsetSec + 2, 'weight_reminder', idx, `Lembrete de carga: ${step.targetWeightKg} quilos.`),
      );
      lastWeight = step.targetWeightKg;
    }

    if (step.setOrder === 1) {
      cues.push(cue(offsetSec + 3, 'encouragement', idx, 'Boa execução. Foque na técnica.'));
    }

    const estimatedSetSec = estimateSetDurationSec(step);
    const isLastStep = idx >= steps.length - 1;

    if (!isLastStep && step.restAfterSeconds > 0) {
      const restStartOffset = offsetSec + estimatedSetSec;
      cues.push(cue(restStartOffset, 'rest_start', idx, `Descanso por ${step.restAfterSeconds} segundos.`));
      if (step.restAfterSeconds > 10) {
        cues.push(
          cue(
            restStartOffset + step.restAfterSeconds - 10,
            'rest_10_left',
            idx,
            'Faltam 10 segundos para a próxima série.',
          ),
        );
      }
      cues.push(cue(restStartOffset + step.restAfterSeconds, 'next_set', idx, 'Próxima série. Prepare-se.'));
      offsetSec = restStartOffset + step.restAfterSeconds;
    } else {
      offsetSec += estimatedSetSec;
    }
  });

  return {
    version: 1,
    estimatedTotalSec: offsetSec,
    cues: cues.sort((a, b) => a.offsetSec - b.offsetSec),
  };
}

function estimateSetDurationSec(step: RunnerStep): number {
  // No rep counting in LISTEN mode; use a simple estimate to schedule cue spacing.
  return Math.min(75, Math.max(25, Math.round(step.targetReps * 3.5)));
}

function cue(offsetSec: number, type: CoachCueType, stepIndex: number, textPtBr: string): CoachTimelineCue {
  return {
    id: `${type}_${stepIndex}_${offsetSec}`,
    offsetSec,
    type,
    stepIndex,
    textPtBr,
  };
}
