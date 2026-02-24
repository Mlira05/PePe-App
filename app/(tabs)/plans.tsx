import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { makeId } from '@/src/lib/id';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { ExerciseCatalogItem, ExerciseSet, SetType, WorkoutExercise, WorkoutPlan } from '@/src/types/models';

type ExerciseSetDraft = ExerciseSet & { tagsJsonText: string };
type WorkoutExerciseDraft = Omit<WorkoutExercise, 'sets'> & { sets: ExerciseSetDraft[] };
type WorkoutPlanDraft = Omit<WorkoutPlan, 'exercises'> & { exercises: WorkoutExerciseDraft[] };
type CatalogFilter = 'all' | 'favorites' | 'recent';

const SET_TYPE_OPTIONS: { value: SetType; label: string }[] = [
  { value: 'warmup', label: 'Warmup' },
  { value: 'working', label: 'Work' },
  { value: 'drop', label: 'Drop' },
  { value: 'failure', label: 'Failure' },
];

export default function PlansScreen() {
  const {
    data,
    isReady,
    upsertWorkoutPlan,
    deleteWorkoutPlan,
    ensureCatalogExercise,
    toggleCatalogFavorite,
  } = useAppStore();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkoutPlanDraft | null>(null);
  const [status, setStatus] = useState<string>('');
  const [catalogQuery, setCatalogQuery] = useState<string>('');
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all');
  const [advancedSetIds, setAdvancedSetIds] = useState<string[]>([]);

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

  const recentCatalog = useMemo(
    () =>
      [...data.exerciseCatalog]
        .filter((item) => Boolean(item.lastUsedAt))
        .sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''))
        .slice(0, 6),
    [data.exerciseCatalog],
  );

  const favoriteCatalog = useMemo(
    () => data.exerciseCatalog.filter((item) => item.isFavorite).slice(0, 6),
    [data.exerciseCatalog],
  );

  const catalogResults = useMemo(() => {
    let list = [...data.exerciseCatalog];
    if (catalogFilter === 'favorites') {
      list = list.filter((item) => item.isFavorite);
    } else if (catalogFilter === 'recent') {
      list = list
        .filter((item) => Boolean(item.lastUsedAt))
        .sort((a, b) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? ''));
    }
    const query = normalizeSearch(catalogQuery);
    if (query) {
      list = list.filter((item) => normalizeSearch(item.name).includes(query));
    }
    return list.slice(0, 12);
  }, [catalogFilter, catalogQuery, data.exerciseCatalog]);

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

  function duplicateCurrentPlan() {
    if (!draft) {
      return;
    }
    const now = new Date().toISOString();
    const plan: WorkoutPlanDraft = {
      ...draft,
      id: makeId('plan'),
      dayLabel: `${draft.dayLabel || 'Plano'} (copia)`,
      createdAt: now,
      updatedAt: now,
      exercises: draft.exercises.map((exercise, exerciseIndex) => cloneExerciseDraft(exercise, exerciseIndex + 1)),
    };
    setSelectedPlanId(plan.id);
    setDraft(plan);
    setStatus('Copia criada (rascunho).');
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

  async function addExerciseFromCatalog(item: ExerciseCatalogItem) {
    if (!draft) {
      return;
    }
    try {
      const resolved = await ensureCatalogExercise({
        name: item.name,
        metadata: item.metadata,
        preferredCatalogExerciseId: item.id,
      });
      patchDraft((prev) => ({
        ...prev,
        exercises: [
          ...prev.exercises,
          {
            id: makeId('ex'),
            order: prev.exercises.length + 1,
            name: resolved.name,
            catalogExerciseId: resolved.id,
            metadata: resolved.metadata,
            notes: '',
            supersetGroupId: '',
            sets: [makeSetDraft(1)],
          },
        ],
        updatedAt: new Date().toISOString(),
      }));
      setStatus(`Exercicio adicionado: ${resolved.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Erro ao adicionar exercicio');
    }
  }

  async function createCustomExerciseFromQuery() {
    const name = catalogQuery.trim();
    if (!name) {
      return;
    }
    try {
      const resolved = await ensureCatalogExercise({ name });
      setCatalogQuery('');
      await addExerciseFromCatalog(resolved);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Erro ao criar exercicio custom');
    }
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

  function duplicateExercise(exerciseId: string) {
    patchDraft((prev) => {
      const index = prev.exercises.findIndex((exercise) => exercise.id === exerciseId);
      if (index < 0) {
        return prev;
      }
      const copy = cloneExerciseDraft(prev.exercises[index], index + 2);
      copy.name = `${prev.exercises[index].name || 'Exercicio'} (copia)`;
      const next = [...prev.exercises];
      next.splice(index + 1, 0, copy);
      return {
        ...prev,
        exercises: next.map((exercise, itemIndex) => ({ ...exercise, order: itemIndex + 1 })),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function moveExercise(exerciseId: string, direction: -1 | 1) {
    patchDraft((prev) => {
      const index = prev.exercises.findIndex((exercise) => exercise.id === exerciseId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.exercises.length) {
        return prev;
      }
      const next = [...prev.exercises];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return {
        ...prev,
        exercises: next.map((exercise, itemIndex) => ({ ...exercise, order: itemIndex + 1 })),
        updatedAt: new Date().toISOString(),
      };
    });
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

  function duplicateSet(exerciseId: string, setId: string) {
    patchDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }
        const index = exercise.sets.findIndex((item) => item.id === setId);
        if (index < 0) {
          return exercise;
        }
        const nextSet: ExerciseSetDraft = { ...exercise.sets[index], id: makeId('set') };
        const sets = [...exercise.sets];
        sets.splice(index + 1, 0, nextSet);
        return {
          ...exercise,
          sets: sets.map((item, setIndex) => ({ ...item, order: setIndex + 1 })),
        };
      }),
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
    setAdvancedSetIds((prev) => prev.filter((id) => id !== setId));
  }

  function bumpSetNumber(
    exerciseId: string,
    setId: string,
    field: 'targetReps' | 'restSeconds',
    delta: number,
    min: number,
  ) {
    patchDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((setDraft) =>
                setDraft.id !== setId
                  ? setDraft
                  : {
                      ...setDraft,
                      [field]: Math.max(min, (setDraft[field] as number) + delta),
                    },
              ),
            },
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function bumpSetWeight(exerciseId: string, setId: string, delta: number) {
    patchDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((setDraft) => {
                if (setDraft.id !== setId) {
                  return setDraft;
                }
                const current = setDraft.targetWeightKg ?? 0;
                const next = Math.max(0, round2(current + delta));
                return { ...setDraft, targetWeightKg: next === 0 ? undefined : next };
              }),
            },
      ),
      updatedAt: new Date().toISOString(),
    }));
  }

  function toggleAdvancedSet(setId: string) {
    setAdvancedSetIds((prev) => (prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]));
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
            label="Duplicar Plano"
            onPress={duplicateCurrentPlan}
            disabled={!isReady || !draft}
            variant="secondary"
          />
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

            <View style={styles.catalogCard}>
              <Text style={styles.sectionSubtitle}>Catalogo local</Text>
              <FormField
                label="Buscar exercicio"
                value={catalogQuery}
                onChangeText={setCatalogQuery}
                placeholder="Supino, agachamento, remada..."
              />
              <View style={styles.row}>
                <ChipButton
                  label="Todos"
                  active={catalogFilter === 'all'}
                  onPress={() => setCatalogFilter('all')}
                />
                <ChipButton
                  label="Favoritos"
                  active={catalogFilter === 'favorites'}
                  onPress={() => setCatalogFilter('favorites')}
                />
                <ChipButton
                  label="Recentes"
                  active={catalogFilter === 'recent'}
                  onPress={() => setCatalogFilter('recent')}
                />
                {catalogQuery.trim() ? (
                  <PrimaryButton
                    label="Criar Custom"
                    onPress={() => void createCustomExerciseFromQuery()}
                    variant="secondary"
                  />
                ) : null}
              </View>

              {favoriteCatalog.length > 0 ? (
                <CatalogSection
                  title="Favoritos"
                  items={favoriteCatalog}
                  onAdd={(item) => void addExerciseFromCatalog(item)}
                  onToggleFavorite={(itemId) => void toggleCatalogFavorite(itemId)}
                />
              ) : null}

              {recentCatalog.length > 0 ? (
                <CatalogSection
                  title="Recentes"
                  items={recentCatalog}
                  onAdd={(item) => void addExerciseFromCatalog(item)}
                  onToggleFavorite={(itemId) => void toggleCatalogFavorite(itemId)}
                />
              ) : null}

              <CatalogSection
                title="Resultados"
                items={catalogResults}
                emptyText="Nenhum exercicio encontrado."
                onAdd={(item) => void addExerciseFromCatalog(item)}
                onToggleFavorite={(itemId) => void toggleCatalogFavorite(itemId)}
              />
            </View>

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
                  {exercise.metadata ? (
                    <Text style={styles.exerciseMeta}>{formatExerciseMetadata(exercise.metadata)}</Text>
                  ) : null}
                  <View style={styles.row}>
                    <ChipButton
                      label="Up"
                      onPress={() => moveExercise(exercise.id, -1)}
                      disabled={exerciseIndex === 0}
                    />
                    <ChipButton
                      label="Down"
                      onPress={() => moveExercise(exercise.id, 1)}
                      disabled={exerciseIndex === draft.exercises.length - 1}
                    />
                    <ChipButton label="Duplicar" onPress={() => duplicateExercise(exercise.id)} />
                  </View>

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

                      <View style={styles.row}>
                        <ChipButton
                          label="-1 rep"
                          onPress={() => bumpSetNumber(exercise.id, setItem.id, 'targetReps', -1, 1)}
                        />
                        <ChipButton
                          label="+1 rep"
                          onPress={() => bumpSetNumber(exercise.id, setItem.id, 'targetReps', 1, 1)}
                        />
                        <ChipButton
                          label="-15s"
                          onPress={() => bumpSetNumber(exercise.id, setItem.id, 'restSeconds', -15, 0)}
                        />
                        <ChipButton
                          label="+15s"
                          onPress={() => bumpSetNumber(exercise.id, setItem.id, 'restSeconds', 15, 0)}
                        />
                        <ChipButton
                          label={`-${data.settings.quickAdjust.weightStepSmallKg}kg`}
                          onPress={() =>
                            bumpSetWeight(
                              exercise.id,
                              setItem.id,
                              -Math.abs(data.settings.quickAdjust.weightStepSmallKg || 2.5),
                            )
                          }
                        />
                        <ChipButton
                          label={`+${data.settings.quickAdjust.weightStepSmallKg}kg`}
                          onPress={() =>
                            bumpSetWeight(
                              exercise.id,
                              setItem.id,
                              Math.abs(data.settings.quickAdjust.weightStepSmallKg || 2.5),
                            )
                          }
                        />
                        <ChipButton label="Duplicar serie" onPress={() => duplicateSet(exercise.id, setItem.id)} />
                        <ChipButton
                          label={advancedSetIds.includes(setItem.id) ? 'Ocultar advanced' : 'Advanced'}
                          onPress={() => toggleAdvancedSet(setItem.id)}
                          active={advancedSetIds.includes(setItem.id)}
                        />
                      </View>

                      <View style={styles.row}>
                        {SET_TYPE_OPTIONS.map((option) => (
                          <ChipButton
                            key={option.value}
                            label={option.label}
                            active={(setItem.setType ?? 'working') === option.value}
                            onPress={() =>
                              patchDraft((prev) => ({
                                ...prev,
                                exercises: prev.exercises.map((item) =>
                                  item.id !== exercise.id
                                    ? item
                                    : {
                                        ...item,
                                        sets: item.sets.map((setDraft) =>
                                          setDraft.id === setItem.id
                                            ? { ...setDraft, setType: option.value }
                                            : setDraft,
                                        ),
                                      },
                                ),
                              }))
                            }
                          />
                        ))}
                      </View>

                      {advancedSetIds.includes(setItem.id) ? (
                        <View style={styles.advancedCard}>
                        <View style={styles.row}>
                            <View style={styles.third}>
                              <FormField
                                label="Drop group"
                                value={setItem.dropSetGroupId ?? ''}
                                onChangeText={(dropSetGroupId) =>
                                  patchDraft((prev) => ({
                                    ...prev,
                                    exercises: prev.exercises.map((item) =>
                                      item.id !== exercise.id
                                        ? item
                                        : {
                                            ...item,
                                            sets: item.sets.map((setDraft) =>
                                              setDraft.id === setItem.id
                                                ? { ...setDraft, dropSetGroupId }
                                                : setDraft,
                                            ),
                                          },
                                    ),
                                  }))
                                }
                                placeholder="DS-A"
                              />
                            </View>
                            <View style={styles.third}>
                              <FormField
                                label="Tempo"
                                value={setItem.tempo ?? ''}
                                onChangeText={(tempo) =>
                                  patchDraft((prev) => ({
                                    ...prev,
                                    exercises: prev.exercises.map((item) =>
                                      item.id !== exercise.id
                                        ? item
                                        : {
                                            ...item,
                                            sets: item.sets.map((setDraft) =>
                                              setDraft.id === setItem.id ? { ...setDraft, tempo } : setDraft,
                                            ),
                                          },
                                    ),
                                  }))
                                }
                                placeholder="3-1-1-0"
                              />
                            </View>
                          </View>
                          <View style={styles.row}>
                            <View style={styles.third}>
                              <FormField
                                label="RPE"
                                value={setItem.rpe != null ? String(setItem.rpe) : ''}
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
                                                ? { ...setDraft, rpe: parseOptionalDecimal(value) }
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
                                label="RIR"
                                value={setItem.rir != null ? String(setItem.rir) : ''}
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
                                                ? { ...setDraft, rir: parseOptionalDecimal(value) }
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
                        </View>
                      ) : null}

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

function ChipButton({
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        stylesUi.chipButton,
        {
          borderColor: active ? colors.accent : colors.border,
          backgroundColor: active ? colors.accentSoft : colors.surfaceAlt,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[stylesUi.chipLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function CatalogSection({
  title,
  items,
  onAdd,
  onToggleFavorite,
  emptyText,
}: {
  title: string;
  items: ExerciseCatalogItem[];
  onAdd: (item: ExerciseCatalogItem) => void;
  onToggleFavorite: (itemId: string) => void;
  emptyText?: string;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.catalogBlock}>
      <Text style={styles.helper}>{title}</Text>
      {items.length === 0 ? (
        emptyText ? <Text style={styles.helper}>{emptyText}</Text> : null
      ) : (
        <View style={styles.catalogList}>
          {items.map((item) => (
            <CatalogRow
              key={item.id}
              item={item}
              onAdd={() => onAdd(item)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CatalogRow({
  item,
  onAdd,
  onToggleFavorite,
}: {
  item: ExerciseCatalogItem;
  onAdd: () => void;
  onToggleFavorite: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.catalogRow}>
      <View style={styles.catalogText}>
        <Text style={styles.catalogName}>{item.name}</Text>
        <Text style={styles.catalogMeta}>
          {formatExerciseMetadata(item.metadata)}
          {item.isUserCreated ? ' | custom' : ''}
          {item.usageCount ? ` | uso ${item.usageCount}` : ''}
        </Text>
      </View>
      <View style={styles.row}>
        <ChipButton label={item.isFavorite ? 'Fav' : 'Star'} onPress={onToggleFavorite} active={item.isFavorite} />
        <PrimaryButton label="Adicionar" onPress={onAdd} />
      </View>
    </View>
  );
}

function makeSetDraft(order: number): ExerciseSetDraft {
  return {
    id: makeId('set'),
    order,
    targetReps: 10,
    targetWeightKg: undefined,
    restSeconds: 90,
    setType: 'working',
    dropSetGroupId: '',
    rpe: undefined,
    rir: undefined,
    tempo: '',
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
        setType: setItem.setType ?? 'working',
        dropSetGroupId: setItem.dropSetGroupId ?? '',
        tempo: setItem.tempo ?? '',
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
        setType: setItem.setType ?? 'working',
        dropSetGroupId: normalizeOptionalText(setItem.dropSetGroupId),
        rpe: parseOptionalDecimal(setItem.rpe != null ? String(setItem.rpe) : ''),
        rir: parseOptionalDecimal(setItem.rir != null ? String(setItem.rir) : ''),
        tempo: normalizeOptionalText(setItem.tempo),
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

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function formatExerciseMetadata(metadata: WorkoutExercise['metadata']): string {
  if (!metadata) {
    return 'sem metadados';
  }
  return [metadata.primaryMuscleGroup, metadata.equipment, metadata.type].filter(Boolean).join(' | ');
}

function cloneExerciseDraft(source: WorkoutExerciseDraft, order: number): WorkoutExerciseDraft {
  return {
    ...source,
    id: makeId('ex'),
    order,
    sets: source.sets.map((setItem, index) => ({
      ...setItem,
      id: makeId('set'),
      order: index + 1,
    })),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

const stylesUi = StyleSheet.create({
  chipButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
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
    color: colors.textMuted,
  },
  editor: {
    gap: 10,
  },
  catalogCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.surfaceAlt,
    gap: 10,
  },
  catalogBlock: {
    gap: 6,
  },
  catalogList: {
    gap: 8,
  },
  catalogRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 10,
    gap: 8,
  },
  catalogText: {
    gap: 2,
  },
  catalogName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  catalogMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surfaceAlt,
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
    color: colors.text,
  },
  exerciseMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  setCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
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
    color: colors.textMuted,
  },
  advancedCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    backgroundColor: colors.surfaceAlt,
    gap: 8,
  },
  status: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
});
}
