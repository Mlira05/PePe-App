import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { makeId } from '@/src/lib/id';
import { flattenWorkoutPlan, getReadCoachText } from '@/src/lib/workoutRuntime';
import { useAppStore } from '@/src/state/AppStore';
import type { RunnerStep } from '@/src/lib/workoutRuntime';
import type { SessionSetLog, WorkoutSession } from '@/src/types/models';

type RunnerMode = 'read' | 'listen';
type RunnerPhase = 'set' | 'rest' | 'done';

interface ActiveReadSession {
  id: string;
  planId: string;
  planLabel: string;
  startedAt: string;
  stepIndex: number;
  phase: RunnerPhase;
  restRemaining: number;
  setLogs: SessionSetLog[];
}

export default function RunnerScreen() {
  const { data, addSession } = useAppStore();
  const [mode, setMode] = useState<RunnerMode>('read');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveReadSession | null>(null);
  const [actualRepsInput, setActualRepsInput] = useState('');
  const [actualWeightInput, setActualWeightInput] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!selectedPlanId && data.workoutPlans[0]) {
      setSelectedPlanId(data.workoutPlans[0].id);
    }
  }, [data.workoutPlans, selectedPlanId]);

  const selectedPlan = data.workoutPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const steps = useMemo(() => (selectedPlan ? flattenWorkoutPlan(selectedPlan) : []), [selectedPlan]);
  const currentStep = activeSession ? steps[activeSession.stepIndex] : undefined;
  const activePhase = activeSession?.phase;
  const activeStepIndex = activeSession?.stepIndex;

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'rest') {
      return;
    }
    if (activeSession.restRemaining <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setActiveSession((prev) => {
        if (!prev || prev.phase !== 'rest') {
          return prev;
        }
        const nextRemaining = Math.max(0, prev.restRemaining - 1);
        if (nextRemaining > 0) {
          return { ...prev, restRemaining: nextRemaining };
        }
        const nextStepIndex = Math.min(prev.stepIndex + 1, Math.max(0, steps.length - 1));
        const nextPhase: RunnerPhase = nextStepIndex >= steps.length ? 'done' : 'set';
        return {
          ...prev,
          stepIndex: nextStepIndex,
          phase: nextPhase,
          restRemaining: 0,
        };
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeSession, steps.length]);

  useEffect(() => {
    if (!currentStep || activePhase !== 'set') {
      return;
    }
    setActualRepsInput(String(currentStep.targetReps));
    setActualWeightInput(currentStep.targetWeightKg != null ? String(currentStep.targetWeightKg) : '');
  }, [activePhase, activeStepIndex, currentStep]);

  function startReadSession() {
    if (!selectedPlan) {
      setStatus('Selecione um plano.');
      return;
    }
    const runnerSteps = flattenWorkoutPlan(selectedPlan);
    if (runnerSteps.length === 0) {
      setStatus('O plano selecionado não possui séries.');
      return;
    }
    setActiveSession({
      id: makeId('session'),
      planId: selectedPlan.id,
      planLabel: selectedPlan.dayLabel,
      startedAt: new Date().toISOString(),
      stepIndex: 0,
      phase: 'set',
      restRemaining: 0,
      setLogs: [],
    });
    setStatus('');
  }

  function markSetDone() {
    if (!activeSession || !currentStep) {
      return;
    }

    const actualReps = parseOptionalInt(actualRepsInput);
    const actualWeightKg = parseOptionalDecimal(actualWeightInput);

    const log: SessionSetLog = {
      exerciseId: currentStep.exerciseId,
      exerciseName: currentStep.exerciseName,
      setId: currentStep.setId,
      setOrder: currentStep.setOrder,
      targetReps: currentStep.targetReps,
      targetWeightKg: currentStep.targetWeightKg,
      actualReps,
      actualWeightKg,
      completedAt: new Date().toISOString(),
    };

    const isLastStep = activeSession.stepIndex >= steps.length - 1;
    const shouldRest = !isLastStep && currentStep.restSeconds > 0;

    setActiveSession((prev) => {
      if (!prev) {
        return prev;
      }
      const nextLogs = [...prev.setLogs.filter((item) => item.setId !== log.setId), log];
      return {
        ...prev,
        setLogs: nextLogs,
        phase: isLastStep ? 'done' : shouldRest ? 'rest' : 'set',
        restRemaining: shouldRest ? currentStep.restSeconds : 0,
        stepIndex: shouldRest ? prev.stepIndex : Math.min(prev.stepIndex + 1, steps.length),
      };
    });
  }

  function skipRest() {
    setActiveSession((prev) => {
      if (!prev || prev.phase !== 'rest') {
        return prev;
      }
      const nextStepIndex = Math.min(prev.stepIndex + 1, steps.length);
      return {
        ...prev,
        phase: nextStepIndex >= steps.length ? 'done' : 'set',
        stepIndex: nextStepIndex,
        restRemaining: 0,
      };
    });
  }

  async function finishAndSaveSession() {
    if (!activeSession) {
      return;
    }
    const session: WorkoutSession = {
      id: activeSession.id,
      workoutPlanId: activeSession.planId,
      workoutPlanLabel: activeSession.planLabel,
      startedAt: activeSession.startedAt,
      endedAt: new Date().toISOString(),
      setLogs: activeSession.setLogs.sort((a, b) => {
        if (a.exerciseName === b.exerciseName) {
          return a.setOrder - b.setOrder;
        }
        return a.completedAt?.localeCompare(b.completedAt ?? '') ?? 0;
      }),
    };
    await addSession(session);
    setActiveSession(null);
    setStatus('Sessão salva no histórico.');
  }

  const coachText =
    activeSession && currentStep
      ? getReadCoachText(
          currentStep,
          activeSession.phase === 'done' ? 'done' : activeSession.phase,
          activeSession.restRemaining,
        )
      : 'Selecione um plano e inicie uma sessão para começar o runner.';

  return (
    <ScreenShell title="Sessão" subtitle="READ + LISTEN (coach timeline TTS)">
      <View style={styles.card}>
        <View style={styles.segmentRow}>
          <PrimaryButton
            label="READ"
            onPress={() => setMode('read')}
            variant={mode === 'read' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label="LISTEN"
            onPress={() => setMode('listen')}
            variant={mode === 'listen' ? 'primary' : 'secondary'}
          />
        </View>

        <Text style={styles.label}>Plano de treino</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={selectedPlanId ?? ''} onValueChange={(value) => setSelectedPlanId(String(value))}>
            <Picker.Item label="Selecione um plano" value="" />
            {data.workoutPlans.map((plan) => (
              <Picker.Item key={plan.id} label={plan.dayLabel} value={plan.id} />
            ))}
          </Picker>
        </View>

        {mode === 'read' ? (
          <ReadTabContent
            activeSession={activeSession}
            currentStep={currentStep}
            coachText={coachText}
            actualRepsInput={actualRepsInput}
            actualWeightInput={actualWeightInput}
            onActualRepsChange={setActualRepsInput}
            onActualWeightChange={setActualWeightInput}
            onStartSession={startReadSession}
            onMarkSetDone={markSetDone}
            onSkipRest={skipRest}
            onFinishAndSave={finishAndSaveSession}
          />
        ) : (
          <View style={styles.listenStub}>
            <Text style={styles.listenTitle}>LISTEN (Milestone 5)</Text>
            <Text style={styles.helper}>
              Próximo passo: gerar timeline JSON do coach e falar cues por TTS (início do exercício, série,
              descanso, 10 segundos restantes, próxima série, lembrete de carga, incentivo ocasional).
            </Text>
          </View>
        )}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </ScreenShell>
  );
}

interface ReadTabContentProps {
  activeSession: ActiveReadSession | null;
  currentStep?: RunnerStep;
  coachText: string;
  actualRepsInput: string;
  actualWeightInput: string;
  onActualRepsChange: (value: string) => void;
  onActualWeightChange: (value: string) => void;
  onStartSession: () => void;
  onMarkSetDone: () => void;
  onSkipRest: () => void;
  onFinishAndSave: () => void;
}

function ReadTabContent({
  activeSession,
  currentStep,
  coachText,
  actualRepsInput,
  actualWeightInput,
  onActualRepsChange,
  onActualWeightChange,
  onStartSession,
  onMarkSetDone,
  onSkipRest,
  onFinishAndSave,
}: ReadTabContentProps) {
  return (
    <View style={styles.readWrap}>
      <View style={styles.coachBox}>
        <Text style={styles.coachTitle}>Coach (pt-BR)</Text>
        <Text style={styles.coachText}>{coachText}</Text>
      </View>

      {!activeSession ? (
        <PrimaryButton label="Iniciar Sessão (READ)" onPress={onStartSession} />
      ) : (
        <>
          <Text style={styles.helper}>
            Sessão ativa: {activeSession.planLabel} • Fase: {activeSession.phase.toUpperCase()}
          </Text>
          <Text style={styles.helper}>Séries registradas: {activeSession.setLogs.length}</Text>

          {activeSession.phase === 'set' && currentStep ? (
            <View style={styles.setEditor}>
              <Text style={styles.sectionTitle}>{currentStep.exerciseName}</Text>
              <Text style={styles.helper}>
                Série {currentStep.setOrder}/{currentStep.exerciseSetCount} • Alvo {currentStep.targetReps} reps
                {currentStep.targetWeightKg != null ? ` • ${currentStep.targetWeightKg} kg` : ''}
                {currentStep.supersetGroupId ? ` • Superset ${currentStep.supersetGroupId}` : ''}
              </Text>

              <View style={styles.row}>
                <View style={styles.half}>
                  <FormField
                    label="Reps realizadas"
                    value={actualRepsInput}
                    onChangeText={onActualRepsChange}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.half}>
                  <FormField
                    label="Carga usada (kg)"
                    value={actualWeightInput}
                    onChangeText={onActualWeightChange}
                    keyboardType="numeric"
                    placeholder="Opcional"
                  />
                </View>
              </View>

              <PrimaryButton label="Marcar Série Concluída" onPress={onMarkSetDone} />
            </View>
          ) : null}

          {activeSession.phase === 'rest' ? (
            <View style={styles.restBox}>
              <Text style={styles.restLabel}>Descanso</Text>
              <Text style={styles.restTime}>{activeSession.restRemaining}s</Text>
              <PrimaryButton label="Pular Descanso" onPress={onSkipRest} variant="secondary" />
            </View>
          ) : null}

          {activeSession.phase === 'done' ? (
            <PrimaryButton label="Finalizar e Salvar Sessão" onPress={onFinishAndSave} />
          ) : null}
        </>
      )}
    </View>
  );
}

function parseOptionalInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  readWrap: {
    gap: 10,
  },
  coachBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 6,
  },
  coachTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  coachText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 21,
  },
  helper: {
    fontSize: 13,
    color: '#4b5563',
  },
  setEditor: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
  },
  restBox: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    alignItems: 'center',
  },
  restLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  restTime: {
    fontSize: 28,
    fontWeight: '800',
    color: '#075985',
  },
  listenStub: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 6,
  },
  listenTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  status: {
    fontSize: 13,
    color: '#0f766e',
    fontWeight: '600',
  },
});
