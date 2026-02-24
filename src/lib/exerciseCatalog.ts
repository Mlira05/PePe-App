import { makeId } from '@/src/lib/id';
import type {
  EquipmentType,
  ExerciseCatalogItem,
  ExerciseKind,
  ExerciseMetadata,
  MuscleGroup,
} from '@/src/types/models';

type SeedSpec = {
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups?: MuscleGroup[];
  equipment: EquipmentType;
  type: ExerciseKind;
};

const SEED_CATALOG: SeedSpec[] = [
  { name: 'Supino reto', primaryMuscleGroup: 'chest', secondaryMuscleGroups: ['triceps', 'shoulders'], equipment: 'barbell', type: 'compound' },
  { name: 'Supino inclinado halteres', primaryMuscleGroup: 'chest', secondaryMuscleGroups: ['triceps', 'shoulders'], equipment: 'dumbbell', type: 'compound' },
  { name: 'Remada curvada', primaryMuscleGroup: 'back', secondaryMuscleGroups: ['biceps', 'core'], equipment: 'barbell', type: 'compound' },
  { name: 'Puxada frontal', primaryMuscleGroup: 'back', secondaryMuscleGroups: ['biceps'], equipment: 'cable', type: 'compound' },
  { name: 'Desenvolvimento halteres', primaryMuscleGroup: 'shoulders', secondaryMuscleGroups: ['triceps'], equipment: 'dumbbell', type: 'compound' },
  { name: 'Elevacao lateral', primaryMuscleGroup: 'shoulders', secondaryMuscleGroups: ['triceps'], equipment: 'dumbbell', type: 'isolation' },
  { name: 'Rosca direta', primaryMuscleGroup: 'biceps', equipment: 'barbell', type: 'isolation' },
  { name: 'Triceps corda', primaryMuscleGroup: 'triceps', equipment: 'cable', type: 'isolation' },
  { name: 'Agachamento livre', primaryMuscleGroup: 'legs', secondaryMuscleGroups: ['glutes', 'core'], equipment: 'barbell', type: 'compound' },
  { name: 'Leg press', primaryMuscleGroup: 'legs', secondaryMuscleGroups: ['glutes'], equipment: 'machine', type: 'compound' },
  { name: 'Levantamento terra romeno', primaryMuscleGroup: 'legs', secondaryMuscleGroups: ['glutes', 'back'], equipment: 'barbell', type: 'compound' },
  { name: 'Panturrilha em pe', primaryMuscleGroup: 'legs', equipment: 'machine', type: 'isolation' },
  { name: 'Prancha', primaryMuscleGroup: 'core', equipment: 'bodyweight', type: 'other' },
];

export function normalizeExerciseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function createSeedExerciseCatalog(now = new Date().toISOString()): ExerciseCatalogItem[] {
  return SEED_CATALOG.map((item) => ({
    id: makeId('catalog'),
    name: item.name,
    metadata: {
      primaryMuscleGroup: item.primaryMuscleGroup,
      secondaryMuscleGroups: item.secondaryMuscleGroups ?? [],
      equipment: item.equipment,
      type: item.type,
    },
    isFavorite: false,
    isUserCreated: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  }));
}

export function findCatalogExerciseByName(
  catalog: ExerciseCatalogItem[],
  name: string,
): ExerciseCatalogItem | undefined {
  const normalized = normalizeExerciseName(name);
  return catalog.find((item) => normalizeExerciseName(item.name) === normalized);
}

export function mergeMetadata(
  current: ExerciseMetadata | undefined,
  incoming: ExerciseMetadata | undefined,
): ExerciseMetadata | undefined {
  if (!current && !incoming) {
    return undefined;
  }
  return {
    ...(current ?? {}),
    ...(incoming ?? {}),
    secondaryMuscleGroups:
      incoming?.secondaryMuscleGroups ?? current?.secondaryMuscleGroups ?? undefined,
  };
}
