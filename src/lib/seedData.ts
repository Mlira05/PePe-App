import { makeId } from '@/src/lib/id';
import type { AppData, ImportRecord, SessionSetLog, WorkoutPlan, WorkoutSession } from '@/src/types/models';

export function createDemoSeedData(base: AppData): AppData {
  const now = new Date();
  const createdAt = now.toISOString();

  const planUpper = createUpperPlan(createdAt);
  const planLower = createLowerPlan(createdAt);

  const sessions = [
    createSessionFromPlan(planUpper, daysAgoIso(6), [
      { exercise: 'Supino reto', setOrder: 1, reps: 10, weight: 60 },
      { exercise: 'Supino reto', setOrder: 2, reps: 9, weight: 60 },
      { exercise: 'Remada curvada', setOrder: 1, reps: 10, weight: 50 },
      { exercise: 'Remada curvada', setOrder: 2, reps: 10, weight: 50 },
      { exercise: 'Desenvolvimento halteres', setOrder: 1, reps: 12, weight: 18 },
      { exercise: 'Desenvolvimento halteres', setOrder: 2, reps: 11, weight: 18 },
    ]),
    createSessionFromPlan(planLower, daysAgoIso(4), [
      { exercise: 'Agachamento livre', setOrder: 1, reps: 8, weight: 80 },
      { exercise: 'Agachamento livre', setOrder: 2, reps: 8, weight: 80 },
      { exercise: 'Levantamento terra romeno', setOrder: 1, reps: 10, weight: 70 },
      { exercise: 'Levantamento terra romeno', setOrder: 2, reps: 10, weight: 70 },
      { exercise: 'Panturrilha em pe', setOrder: 1, reps: 15, weight: 40 },
      { exercise: 'Panturrilha em pe', setOrder: 2, reps: 14, weight: 40 },
    ]),
    createSessionFromPlan(planUpper, daysAgoIso(1), [
      { exercise: 'Supino reto', setOrder: 1, reps: 8, weight: 65 },
      { exercise: 'Supino reto', setOrder: 2, reps: 7, weight: 65 },
      { exercise: 'Remada curvada', setOrder: 1, reps: 8, weight: 55 },
      { exercise: 'Remada curvada', setOrder: 2, reps: 8, weight: 55 },
      { exercise: 'Desenvolvimento halteres', setOrder: 1, reps: 10, weight: 20 },
      { exercise: 'Desenvolvimento halteres', setOrder: 2, reps: 9, weight: 20 },
    ]),
  ];

  const importRecord: ImportRecord = {
    id: makeId('import'),
    source: 'csv',
    filename: 'seed-demo-data',
    status: 'completed',
    summary: 'Dados demo inseridos pelo botão Seed Demo Data.',
    createdAt,
    metadataJson: { seeded: true, plans: 2, sessions: sessions.length },
  };

  return {
    ...base,
    profile: {
      ...base.profile,
      name: base.profile.name || 'Usuário Demo',
      age: base.profile.age ?? 31,
      heightCm: base.profile.heightCm ?? 176,
      weightKg: base.profile.weightKg ?? 78,
      experienceLevel: base.profile.experienceLevel ?? 'intermediario',
      sedentaryLevel: base.profile.sedentaryLevel ?? 'medio',
      goals: base.profile.goals || 'Melhorar força e consistência (4x/semana).',
    },
    workoutPlans: [...base.workoutPlans, planUpper, planLower],
    sessions: [...sessions, ...base.sessions],
    imports: [importRecord, ...base.imports],
  };
}

function createUpperPlan(timestamp: string): WorkoutPlan {
  return {
    id: makeId('plan'),
    dayLabel: 'Segunda - Superior (Demo)',
    notes: 'Foco em empurrar + puxar',
    createdAt: timestamp,
    updatedAt: timestamp,
    exercises: [
      createExercise('Supino reto', 1, [
        setSpec(1, 10, 60, 90),
        setSpec(2, 10, 60, 90),
      ]),
      createExercise('Remada curvada', 2, [
        setSpec(1, 10, 50, 90),
        setSpec(2, 10, 50, 90),
      ]),
      createExercise(
        'Desenvolvimento halteres',
        3,
        [setSpec(1, 12, 18, 75), setSpec(2, 12, 18, 75)],
        'SS-A',
      ),
      createExercise('Elevacao lateral', 4, [setSpec(1, 15, 8, 45), setSpec(2, 15, 8, 45)], 'SS-A'),
    ],
  };
}

function createLowerPlan(timestamp: string): WorkoutPlan {
  return {
    id: makeId('plan'),
    dayLabel: 'Quarta - Inferior (Demo)',
    notes: 'Foco em pernas + posterior',
    createdAt: timestamp,
    updatedAt: timestamp,
    exercises: [
      createExercise('Agachamento livre', 1, [setSpec(1, 8, 80, 120), setSpec(2, 8, 80, 120)]),
      createExercise('Levantamento terra romeno', 2, [setSpec(1, 10, 70, 90), setSpec(2, 10, 70, 90)]),
      createExercise('Panturrilha em pe', 3, [setSpec(1, 15, 40, 45), setSpec(2, 15, 40, 45)]),
    ],
  };
}

function createExercise(
  name: string,
  order: number,
  sets: { order: number; reps: number; weight?: number; rest: number }[],
  supersetGroupId?: string,
) {
  return {
    id: makeId('ex'),
    order,
    name,
    supersetGroupId,
    notes: undefined,
    sets: sets.map((spec) => ({
      id: makeId('set'),
      order: spec.order,
      targetReps: spec.reps,
      targetWeightKg: spec.weight,
      restSeconds: spec.rest,
      notes: undefined,
      tagsJson: undefined,
    })),
  };
}

function setSpec(order: number, reps: number, weight: number | undefined, rest: number) {
  return { order, reps, weight, rest };
}

function createSessionFromPlan(
  plan: WorkoutPlan,
  startedAt: string,
  performed: { exercise: string; setOrder: number; reps: number; weight?: number }[],
): WorkoutSession {
  const logs: SessionSetLog[] = [];

  performed.forEach((item, idx) => {
    const exercise = plan.exercises.find((ex) => ex.name === item.exercise);
    const setItem = exercise?.sets.find((set) => set.order === item.setOrder);
    if (!exercise || !setItem) {
      return;
    }
    logs.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setId: setItem.id,
      setOrder: setItem.order,
      targetReps: setItem.targetReps,
      targetWeightKg: setItem.targetWeightKg,
      actualReps: item.reps,
      actualWeightKg: item.weight ?? setItem.targetWeightKg,
      completedAt: new Date(new Date(startedAt).getTime() + (idx + 1) * 90_000).toISOString(),
    });
  });

  const endMs = new Date(startedAt).getTime() + Math.max(35, logs.length * 4) * 60_000;
  return {
    id: makeId('session'),
    workoutPlanId: plan.id,
    workoutPlanLabel: plan.dayLabel,
    startedAt,
    endedAt: new Date(endMs).toISOString(),
    setLogs: logs,
  };
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(18, 0, 0, 0);
  return date.toISOString();
}
