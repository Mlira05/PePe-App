import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Speech from 'expo-speech';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { buildCoachTimeline } from '@/src/lib/coachTimeline';
import { makeId } from '@/src/lib/id';
import { flattenWorkoutPlan, getReadCoachText } from '@/src/lib/workoutRuntime';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { RunnerStep } from '@/src/lib/workoutRuntime';
import type { SessionSetLog, WorkoutSession } from '@/src/types/models';

type RunnerPhase = 'set' | 'rest' | 'done';

interface ActiveSession {
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [actualRepsInput, setActualRepsInput] = useState('');
  const [actualWeightInput, setActualWeightInput] = useState('');
  const [status, setStatus] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [showTimelinePreview, setShowTimelinePreview] = useState(false);
  const listenTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!selectedPlanId && data.workoutPlans[0]) {
      setSelectedPlanId(data.workoutPlans[0].id);
    }
  }, [data.workoutPlans, selectedPlanId]);

  const selectedPlan = data.workoutPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const steps = useMemo(() => (selectedPlan ? flattenWorkoutPlan(selectedPlan) : []), [selectedPlan]);
  const coachTimeline = useMemo(() => buildCoachTimeline(steps), [steps]);
  const currentStep = activeSession ? steps[activeSession.stepIndex] : undefined;
  const activePhase = activeSession?.phase;
  const activeStepIndex = activeSession?.stepIndex;

  useEffect(() => {
    return () => {
      stopTimelinePlayback();
    };
  }, []);

  useEffect(() => {
    if (isVoiceMuted) {
      stopTimelinePlayback();
      setVoiceStatus('Voz mutada.');
    }
  }, [isVoiceMuted]);

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
        const nextStepIndex = Math.min(prev.stepIndex + 1, Math.max(0, steps.length));
        return {
          ...prev,
          stepIndex: nextStepIndex,
          phase: nextStepIndex >= steps.length ? 'done' : 'set',
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
    if (steps.length === 0) {
      setStatus('O plano selecionado nao possui series.');
      return;
    }
    stopTimelinePlayback();
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
    if (!isVoiceMuted) {
      startTimelinePlayback();
    }
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
    stopTimelinePlayback();
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
    setStatus('Sessao salva no historico.');
  }

  function startTimelinePlayback() {
    if (isVoiceMuted) {
      setVoiceStatus('Voz esta mutada.');
      return;
    }
    if (!selectedPlan) {
      setVoiceStatus('Selecione um plano para gerar a timeline.');
      return;
    }
    if (coachTimeline.cues.length === 0) {
      setVoiceStatus('O plano nao possui series para gerar cues.');
      return;
    }
    stopTimelinePlayback();
    setVoiceStatus('Coach de voz iniciado.');
    setIsTimelinePlaying(true);

    coachTimeline.cues.forEach((cue) => {
      const timeout = setTimeout(() => {
        Speech.speak(cue.textPtBr, {
          language: 'pt-BR',
          rate: 0.95,
          pitch: 1,
        });
      }, cue.offsetSec * 1000);
      listenTimeoutsRef.current.push(timeout);
    });

    const doneTimeout = setTimeout(() => {
      setIsTimelinePlaying(false);
      setVoiceStatus('Timeline concluida.');
    }, (coachTimeline.estimatedTotalSec + 2) * 1000);
    listenTimeoutsRef.current.push(doneTimeout);
  }

  function stopTimelinePlayback() {
    listenTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    listenTimeoutsRef.current = [];
    Speech.stop();
    setIsTimelinePlaying(false);
  }

  const coachText =
    activeSession && currentStep
      ? getReadCoachText(
          currentStep,
          activeSession.phase === 'done' ? 'done' : activeSession.phase,
          activeSession.restRemaining,
        )
      : 'Selecione um plano e inicie uma sessao. O texto do coach fica sempre visivel.';

  return (
    <ScreenShell title="Sessao" subtitle="Texto + voz juntos (mute opcional)">
      <View style={styles.card}>
        <Text style={styles.label}>Plano de treino</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedPlanId ?? ''}
            style={{ color: colors.text }}
            dropdownIconColor={colors.accent}
            onValueChange={(value) => setSelectedPlanId(String(value))}
          >
            <Picker.Item label="Selecione um plano" value="" />
            {data.workoutPlans.map((plan) => (
              <Picker.Item key={plan.id} label={plan.dayLabel} value={plan.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.rowWrap}>
          <PrimaryButton
            label={isVoiceMuted ? 'Desmutar Voz' : 'Mutar Voz'}
            onPress={() => setIsVoiceMuted((prev) => !prev)}
            variant={isVoiceMuted ? 'secondary' : 'primary'}
          />
          <PrimaryButton
            label={isTimelinePlaying ? 'Voz tocando...' : 'Reproduzir Voz'}
            onPress={startTimelinePlayback}
            variant="secondary"
            disabled={isTimelinePlaying}
          />
          <PrimaryButton label="Parar Voz" onPress={stopTimelinePlayback} variant="secondary" />
          <PrimaryButton
            label={showTimelinePreview ? 'Ocultar Timeline' : 'Ver Timeline'}
            onPress={() => setShowTimelinePreview((prev) => !prev)}
            variant="secondary"
          />
        </View>

        <Text style={styles.helper}>
          Voz: {isVoiceMuted ? 'mutada' : 'ativa'} • Timeline: {coachTimeline.estimatedTotalSec}s • Cues:{' '}
          {coachTimeline.cues.length}
        </Text>
        {voiceStatus ? <Text style={styles.status}>{voiceStatus}</Text> : null}

        <ReadSessionContent
          styles={styles}
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

        {showTimelinePreview ? (
          <View style={styles.timelineBox}>
            <Text style={styles.timelineTitle}>coachTimeline.json (preview)</Text>
            <Text style={styles.timelineText}>{JSON.stringify(coachTimeline, null, 2)}</Text>
          </View>
        ) : null}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </ScreenShell>
  );
}

interface ReadSessionContentProps {
  styles: ReturnType<typeof createStyles>;
  activeSession: ActiveSession | null;
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

function ReadSessionContent({
  styles,
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
}: ReadSessionContentProps) {
  return (
    <View style={styles.readWrap}>
      <View style={styles.coachBox}>
        <Text style={styles.coachTitle}>Coach (pt-BR)</Text>
        <Text style={styles.coachText}>{coachText}</Text>
      </View>

      {!activeSession ? (
        <PrimaryButton label="Iniciar Sessao" onPress={onStartSession} />
      ) : (
        <>
          <Text style={styles.helper}>
            Sessao ativa: {activeSession.planLabel} • Fase: {activeSession.phase.toUpperCase()}
          </Text>
          <Text style={styles.helper}>Series registradas: {activeSession.setLogs.length}</Text>

          {activeSession.phase === 'set' && currentStep ? (
            <View style={styles.setEditor}>
              <Text style={styles.sectionTitle}>{currentStep.exerciseName}</Text>
              <Text style={styles.helper}>
                Serie {currentStep.setOrder}/{currentStep.exerciseSetCount} • Alvo {currentStep.targetReps} reps
                {currentStep.targetWeightKg != null ? ` • ${currentStep.targetWeightKg} kg` : ''}
                {currentStep.supersetGroupId ? ` • Superset ${currentStep.supersetGroupId}` : ''}
              </Text>

              <View style={styles.rowTwo}>
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

              <PrimaryButton label="Marcar Serie Concluida" onPress={onMarkSetDone} />
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
            <PrimaryButton label="Finalizar e Salvar Sessao" onPress={onFinishAndSave} />
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
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    pickerWrap: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      overflow: 'hidden',
    },
    rowWrap: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    rowTwo: {
      flexDirection: 'row',
      gap: 8,
    },
    half: {
      flex: 1,
    },
    readWrap: {
      gap: 10,
    },
    coachBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      padding: 12,
      gap: 6,
    },
    coachTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
    coachText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 21,
    },
    helper: {
      fontSize: 13,
      color: colors.textMuted,
    },
    setEditor: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 10,
      backgroundColor: colors.surfaceAlt,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    restBox: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      alignItems: 'center',
    },
    restLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.accent,
    },
    restTime: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },
    timelineBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      padding: 10,
      gap: 6,
      maxHeight: 260,
    },
    timelineTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    timelineText: {
      fontFamily: 'monospace',
      fontSize: 11,
      color: colors.textMuted,
    },
    status: {
      fontSize: 13,
      color: colors.accent,
      fontWeight: '600',
    },
  });
}
