import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { makeId } from '@/src/lib/id';
import { useAppStore } from '@/src/state/AppStore';
import type { ExerciseSet, WorkoutExercise, WorkoutPlan } from '@/src/types/models';

type ExerciseSetDraft = ExerciseSet & { tagsJsonText: string };
type WorkoutExerciseDraft = Omit<WorkoutExercise, 'sets'> & { sets: ExerciseSetDraft[] };
type WorkoutPlanDraft = Omit<WorkoutPlan, 'exercises'> & { exercises: WorkoutExerciseDraft[] };

export default function PlansScreen() {
  const { data, isReady, upsertWorkoutPlan, deleteWorkoutPlan } = useAppStore();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkoutPlanDraft | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!selectedPlanId && data.workoutPlans.length > 0) {
      const first = data.workoutPlans[0];
      setSelectedPlanId(first.id);
      setDraft(toDraft(first));
      return;
    }

    if (selectedPlanId) {
      const source = data.workoutPlans.find((plan) => plan.id === selectedPlanId);
      if (!source) {
        setSelectedPlanId(data.workoutPlans[0]?.id ?? null);
        setDraft(data.workoutPlans[0] ? toDraft(data.workoutPlans[0]) : null);
        return;
      }
      if (!draft || draft.id !== source.id) {
        setDraft(toDraft(source));
      }
    }
  }, [data.workoutPlans, draft, selectedPlanId]);

  function createPlan() {
    const now = new Date().toISOString();
    const plan: WorkoutPlanDraft = {
      id: makeId('plan'),
      dayLabel: `Dia ${data.workoutPlans.length + 1}`,
      notes: '',
      exercises: [],
      createdAt: now,
      updatedAt: now,
    };
    setSelectedPlanId(plan.id);
    setDraft(plan);
    setStatus('Novo plano criado (rascunho).');
  }

  function selectPlan(plan: WorkoutPlan) {
    setSelectedPlanId(plan.id);
    setDraft(toDraft(plan));
    setStatus('');
  }

  function patchDraft(mutator: (prev: WorkoutPlanDraft) => WorkoutPlanDraft) {
    setDraft((prev) => (prev ? mutator(prev) : prev));
  }

  function addExercise() {
    patchDraft((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          id: makeId('ex'),
          order: prev.exercises.length + 1,
          name: '',
          notes: '',
          supersetGroupId: '',
          sets: [makeSetDraft(1)],
        },
      ],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeExercise(exerciseId: string) {
    patchDraft((prev) => ({
      ...prev,
      exercises: prev.exercises
        .filter((exercise) => exercise.id !== exerciseId)
        .map((exercise, index) => ({ ...exercise, order: index + 1 })),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addSet(exerciseId: string) {
    patchDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: [...exercise.sets, makeSetDraft(exercise.sets.length + 1)],
            },
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeSet(exerciseId: string, setId: string) {
    patchDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets
                .filter((item) => item.id !== setId)
                .map((item, index) => ({ ...item, order: index + 1 })),
            },
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  async function handleSaveDraft() {
    if (!draft) {
      return;
    }
    try {
      const plan = fromDraft(draft);
      await upsertWorkoutPlan({ ...plan, updatedAt: new Date().toISOString() });
      setStatus('Plano salvo localmente.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar plano';
      setStatus(message);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedPlanId) {
      return;
    }
    const exists = data.workoutPlans.some((plan) => plan.id === selectedPlanId);
    if (!exists) {
      setDraft(null);
      setSelectedPlanId(null);
      return;
    }
    await deleteWorkoutPlan(selectedPlanId);
    setStatus('Plano removido.');
    setSelectedPlanId(null);
    setDraft(null);
  }

  return (
    <ScreenShell title="Treinos" subtitle="CRUD de planos e exercícios">
      <View style={styles.card}>
        <View style={styles.row}>
          <PrimaryButton label="Novo Plano" onPress={createPlan} disabled={!isReady} />
          <PrimaryButton
            label="Salvar Plano"
            onPress={handleSaveDraft}
            disabled={!isReady || !draft}
            variant="secondary"
          />
          <PrimaryButton
            label="Excluir"
            onPress={() => {
              Alert.alert('Excluir plano', 'Remover o plano selecionado?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => void handleDeleteSelected() },
              ]);
            }}
            disabled={!isReady || !selectedPlanId}
            variant="danger"
          />
        </View>

        <Text style={styles.sectionTitle}>Planos salvos</Text>
        <View style={styles.chipsWrap}>
          {data.workoutPlans.length === 0 ? (
            <Text style={styles.helper}>Nenhum plano salvo ainda.</Text>
          ) : (
            data.workoutPlans.map((plan) => (
              <View key={plan.id} style={styles.chip}>
                <PrimaryButton
                  label={plan.dayLabel}
                  onPress={() => selectPlan(plan)}
                  variant={selectedPlanId === plan.id ? 'primary' : 'secondary'}
                />
              </View>
            ))
          )}
        </View>

        {!draft ? (
          <Text style={styles.helper}>Crie um plano para começar a cadastrar exercícios e séries.</Text>
        ) : (
          <View style={styles.editor}>
            <Text style={styles.sectionTitle}>Editor do plano</Text>
            <FormField
              label="Rótulo do dia"
              value={draft.dayLabel}
              onChangeText={(dayLabel) => patchDraft((prev) => ({ ...prev, dayLabel }))}
              placeholder="Ex.: Segunda - Superior"
            />
            <FormField
              label="Notas do plano"
              value={draft.notes ?? ''}
              onChangeText={(notes) => patchDraft((prev) => ({ ...prev, notes }))}
              placeholder="Observações gerais"
              multiline
            />

            <View style={styles.row}>
              <PrimaryButton label="Adicionar Exercício" onPress={addExercise} variant="secondary" />
            </View>

            {draft.exercises.length === 0 ? (
              <Text style={styles.helper}>Sem exercícios. Adicione o primeiro exercício.</Text>
            ) : (
              draft.exercises.map((exercise, exerciseIndex) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseTitle}>Exercício {exerciseIndex + 1}</Text>
                    <PrimaryButton
                      label="Remover"
                      variant="danger"
                      onPress={() => removeExercise(exercise.id)}
                    />
                  </View>

                  <FormField
                    label="Nome do exercício"
                    value={exercise.name}
                    onChangeText={(name) =>
                      patchDraft((prev) => ({
                        ...prev,
                        exercises: prev.exercises.map((item) =>
                          item.id === exercise.id ? { ...item, name } : item,
                        ),
                      }))
                    }
                    placeholder="Ex.: Supino reto"
                  />

                  <View style={styles.row}>
                    <View style={styles.half}>
                      <FormField
                        label="Grupo superset (opcional)"
                        value={exercise.supersetGroupId ?? ''}
                        onChangeText={(supersetGroupId) =>
                          patchDraft((prev) => ({
                            ...prev,
                            exercises: prev.exercises.map((item) =>
                              item.id === exercise.id ? { ...item, supersetGroupId } : item,
                            ),
                          }))
                        }
                        placeholder="Ex.: SS-A"
                      />
                    </View>
                    <View style={styles.half}>
                      <FormField
                        label="Notas do exercício"
                        value={exercise.notes ?? ''}
                        onChangeText={(notes) =>
                          patchDraft((prev) => ({
                            ...prev,
                            exercises: prev.exercises.map((item) =>
                              item.id === exercise.id ? { ...item, notes } : item,
                            ),
                          }))
                        }
                        placeholder="Cadência, amplitude..."
                      />
                    </View>
                  </View>

                  <Text style={styles.sectionSubtitle}>Séries</Text>
                  {exercise.sets.map((setItem) => (
                    <View key={setItem.id} style={styles.setCard}>
                      <View style={styles.setHeader}>
                        <Text style={styles.setTitle}>Série {setItem.order}</Text>
                        <PrimaryButton
                          label="Remover Série"
                          variant="secondary"
                          onPress={() => removeSet(exercise.id, setItem.id)}
                        />
                      </View>

                      <View style={styles.row}>
                        <View style={styles.third}>
                          <FormField
                            label="Reps alvo"
                            value={String(setItem.targetReps)}
                            onChangeText={(value) =>
                              patchDraft((prev) => ({
                                ...prev,
                                exercises: prev.exercises.map((item) =>
                                  item.id !== exercise.id
                                    ? item
                                    : {
                                        ...item,
                                        sets: item.sets.map((setDraft) =>
                                          setDraft.id === setItem.id
                                            ? {
                                                ...setDraft,
                                                targetReps: parseIntOrFallback(value, setDraft.targetReps),
                                              }
                                            : setDraft,
                                        ),
                                      },
                                ),
                              }))
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.third}>
                          <FormField
                            label="Carga alvo (kg)"
                            value={setItem.targetWeightKg != null ? String(setItem.targetWeightKg) : ''}
                            onChangeText={(value) =>
                              patchDraft((prev) => ({
                                ...prev,
                                exercises: prev.exercises.map((item) =>
                                  item.id !== exercise.id
                                    ? item
                                    : {
                                        ...item,
                                        sets: item.sets.map((setDraft) =>
                                          setDraft.id === setItem.id
                                            ? {
                                                ...setDraft,
                                                targetWeightKg: parseOptionalDecimal(value),
                                              }
                                            : setDraft,
                                        ),
                                      },
                                ),
                              }))
                            }
                            keyboardType="numeric"
                            placeholder="Opcional"
                          />
                        </View>
                        <View style={styles.third}>
                          <FormField
                            label="Descanso (s)"
                            value={String(setItem.restSeconds)}
                            onChangeText={(value) =>
                              patchDraft((prev) => ({
                                ...prev,
                                exercises: prev.exercises.map((item) =>
                                  item.id !== exercise.id
                                    ? item
                                    : {
                                        ...item,
                                        sets: item.sets.map((setDraft) =>
                                          setDraft.id === setItem.id
                                            ? {
                                                ...setDraft,
                                                restSeconds: parseIntOrFallback(value, setDraft.restSeconds),
                                              }
                                            : setDraft,
                                        ),
                                      },
                                ),
                              }))
                            }
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <FormField
                        label="Notas da série"
                        value={setItem.notes ?? ''}
                        onChangeText={(notes) =>
                          patchDraft((prev) => ({
                            ...prev,
                            exercises: prev.exercises.map((item) =>
                              item.id !== exercise.id
                                ? item
                                : {
                                    ...item,
                                    sets: item.sets.map((setDraft) =>
                                      setDraft.id === setItem.id ? { ...setDraft, notes } : setDraft,
                                    ),
                                  },
                            ),
                          }))
                        }
                        placeholder="Dropset / rest-pause / pausas (texto livre)"
                      />
                      <FormField
                        label="tagsJson (opcional)"
                        value={setItem.tagsJsonText}
                        onChangeText={(tagsJsonText) =>
                          patchDraft((prev) => ({
                            ...prev,
                            exercises: prev.exercises.map((item) =>
                              item.id !== exercise.id
                                ? item
                                : {
                                    ...item,
                                    sets: item.sets.map((setDraft) =>
                                      setDraft.id === setItem.id ? { ...setDraft, tagsJsonText } : setDraft,
                                    ),
                                  },
                            ),
                          }))
                        }
                        placeholder='{"pausedReps": true}'
                      />
                    </View>
                  ))}

                  <PrimaryButton
                    label="Adicionar Série"
                    onPress={() => addSet(exercise.id)}
                    variant="secondary"
                  />
                </View>
              ))
            )}
          </View>
        )}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </ScreenShell>
  );
}

function makeSetDraft(order: number): ExerciseSetDraft {
  return {
    id: makeId('set'),
    order,
    targetReps: 10,
    targetWeightKg: undefined,
    restSeconds: 90,
    notes: '',
    tagsJson: undefined,
    tagsJsonText: '',
  };
}

function toDraft(plan: WorkoutPlan): WorkoutPlanDraft {
  return {
    ...plan,
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      supersetGroupId: exercise.supersetGroupId ?? '',
      notes: exercise.notes ?? '',
      sets: exercise.sets.map((setItem) => ({
        ...setItem,
        notes: setItem.notes ?? '',
        tagsJsonText: setItem.tagsJson ? JSON.stringify(setItem.tagsJson) : '',
      })),
    })),
  };
}

function fromDraft(draft: WorkoutPlanDraft): WorkoutPlan {
  return {
    ...draft,
    dayLabel: draft.dayLabel.trim(),
    notes: normalizeOptionalText(draft.notes),
    exercises: draft.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      order: exerciseIndex + 1,
      name: exercise.name.trim() || `Exercício ${exerciseIndex + 1}`,
      notes: normalizeOptionalText(exercise.notes),
      supersetGroupId: normalizeOptionalText(exercise.supersetGroupId),
      sets: exercise.sets.map((setItem, setIndex) => ({
        ...setItem,
        order: setIndex + 1,
        notes: normalizeOptionalText(setItem.notes),
        tagsJson: parseTagsJson(setItem.tagsJsonText),
      })),
    })),
  };
}

function parseTagsJson(value: string): Record<string, string | number | boolean> | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('tagsJson precisa ser um objeto JSON');
  }
  return parsed as Record<string, string | number | boolean>;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseIntOrFallback(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalDecimal(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  half: {
    flex: 1,
    minWidth: 150,
  },
  third: {
    flex: 1,
    minWidth: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minWidth: 120,
  },
  helper: {
    fontSize: 13,
    color: '#4b5563',
  },
  editor: {
    gap: 10,
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  exerciseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  setCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
    gap: 8,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  setTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  status: {
    fontSize: 13,
    color: '#0f766e',
    fontWeight: '600',
  },
});
