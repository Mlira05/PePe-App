import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { makeId } from '@/src/lib/id';
import type { WorkoutPlan } from '@/src/types/models';

type RawRow = Record<string, unknown>;

export interface WorkoutImportParseResult {
  plans: WorkoutPlan[];
  warnings: string[];
}

export function parseWorkoutCsv(csvText: string): WorkoutImportParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return {
      plans: [],
      warnings: parsed.errors.map((error) => `CSV linha ${error.row ?? '?'}: ${error.message}`),
    };
  }

  return parseFlatRows(parsed.data as RawRow[]);
}

export function parseWorkoutXlsxBase64(base64: string): WorkoutImportParseResult {
  const workbook = XLSX.read(base64, { type: 'base64' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { plans: [], warnings: ['XLSX sem abas legíveis.'] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
  return parseFlatRows(rows);
}

function parseFlatRows(rows: RawRow[]): WorkoutImportParseResult {
  const warnings: string[] = [];
  const planOrder: string[] = [];
  const plansByKey = new Map<string, WorkoutPlan>();
  const exerciseKeyMap = new Map<string, string>();

  rows.forEach((rawRow, rowIndex) => {
    const row = normalizeRow(rawRow);
    const dayLabel = pickFirst(row, ['daylabel', 'day', 'plan', 'workoutplan', 'treino', 'dia']);
    const exerciseName = pickFirst(row, ['exercise', 'exercisename', 'name', 'exercicio']);
    const targetReps = parseRequiredPositiveInt(
      pickFirst(row, ['targetreps', 'reps', 'repstarget', 'repeticoes']),
    );
    const restSeconds =
      parseOptionalPositiveInt(pickFirst(row, ['restseconds', 'rest', 'descanso', 'rests'])) ?? 90;

    if (!dayLabel || !exerciseName || !targetReps) {
      warnings.push(
        `Linha ${rowIndex + 2}: colunas obrigatórias ausentes/invalidas (dayLabel, exercise, targetReps).`,
      );
      return;
    }

    const targetWeightKg = parseOptionalDecimal(
      pickFirst(row, ['targetweight', 'targetweightkg', 'weight', 'carga', 'peso']),
    );
    const setNotes = pickFirst(row, ['notes', 'setnotes', 'observacoes', 'observacao']);
    const exerciseNotes = pickFirst(row, ['exercisenotes', 'exnotes']);
    const supersetGroupId = pickFirst(row, ['supersetgroupid', 'superset', 'supersetgroup']);
    const tagsJsonText = pickFirst(row, ['tagsjson', 'tags']);

    const planKey = dayLabel.trim().toLowerCase();
    let plan = plansByKey.get(planKey);
    if (!plan) {
      const now = new Date().toISOString();
      plan = {
        id: makeId('plan'),
        dayLabel: dayLabel.trim(),
        notes: undefined,
        exercises: [],
        createdAt: now,
        updatedAt: now,
      };
      plansByKey.set(planKey, plan);
      planOrder.push(planKey);
    }

    const exerciseKey = [
      plan.id,
      exerciseName.trim().toLowerCase(),
      (supersetGroupId ?? '').trim().toLowerCase(),
      (exerciseNotes ?? '').trim().toLowerCase(),
    ].join('|');

    let exerciseId = exerciseKeyMap.get(exerciseKey);
    if (!exerciseId) {
      exerciseId = makeId('ex');
      exerciseKeyMap.set(exerciseKey, exerciseId);
      plan.exercises.push({
        id: exerciseId,
        order: plan.exercises.length + 1,
        name: exerciseName.trim(),
        notes: normalizeOptional(exerciseNotes),
        supersetGroupId: normalizeOptional(supersetGroupId),
        sets: [],
      });
    }

    const exercise = plan.exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      warnings.push(`Linha ${rowIndex + 2}: falha interna ao agrupar exercício.`);
      return;
    }

    exercise.sets.push({
      id: makeId('set'),
      order: exercise.sets.length + 1,
      targetReps,
      targetWeightKg,
      restSeconds,
      notes: normalizeOptional(setNotes),
      tagsJson: parseTagsJsonSafe(tagsJsonText, warnings, rowIndex + 2),
    });
  });

  const plans = planOrder
    .map((key) => plansByKey.get(key))
    .filter((plan): plan is WorkoutPlan => Boolean(plan))
    .map((plan) => ({
      ...plan,
      exercises: plan.exercises.map((exercise, exerciseIndex) => ({
        ...exercise,
        order: exerciseIndex + 1,
        sets: exercise.sets.map((setItem, setIndex) => ({ ...setItem, order: setIndex + 1 })),
      })),
    }));

  return { plans, warnings };
}

function normalizeRow(raw: RawRow): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(raw).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    out[normalizedKey] = String(value ?? '').trim();
  });
  return out;
}

function pickFirst(row: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function parseRequiredPositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalPositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalDecimal(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTagsJsonSafe(
  value: string | undefined,
  warnings: string[],
  rowNumber: number,
): Record<string, string | number | boolean> | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      warnings.push(`Linha ${rowNumber}: tagsJson ignorado (nao e objeto JSON).`);
      return undefined;
    }
    return parsed as Record<string, string | number | boolean>;
  } catch {
    warnings.push(`Linha ${rowNumber}: tagsJson invalido, ignorado.`);
    return undefined;
  }
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
