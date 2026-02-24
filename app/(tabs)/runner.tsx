import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Speech from 'expo-speech';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { buildCoachTimeline } from '@/src/lib/coachTimeline';
import { makeId } from '@/src/lib/id';
import {
  cancelScheduledRestAlerts,
  scheduleRestAlerts,
  triggerRestForegroundCue,
  type ScheduledRestAlerts,
} from '@/src/lib/restTimerAlerts';
import { flattenWorkoutPlan, getReadCoachText } from '@/src/lib/workoutRuntime';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { RunnerStep } from '@/src/lib/workoutRuntime';
import type { SessionDraft, SessionSetLog, WorkoutSession } from '@/src/types/models';

type ActiveSession = SessionDraft;

export default function RunnerScreen() {
  const { data, addSession, patchData, clearSessionDraft, saveSettings } = useAppStore();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [status, setStatus] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [showTimelinePreview, setShowTimelinePreview] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const listenTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduledRestAlertsRef = useRef<ScheduledRestAlerts | null>(null);
  const restCueMarksRef = useRef<{ warned10: boolean; ended: boolean }>({ warned10: false, ended: false });

  useEffect(() => {
    if (!selectedPlanId && data.workoutPlans[0]) {
      setSelectedPlanId(data.workoutPlans[0].id);
    }
  }, [data.workoutPlans, selectedPlanId]);

  useEffect(() => {
    if (draftHydrated) {
      return;
    }
    if (data.sessionDraft) {
      setActiveSession(data.sessionDraft);
      setSelectedPlanId(data.sessionDraft.workoutPlanId);
    }
    setDraftHydrated(true);
  }, [data.sessionDraft, draftHydrated]);

  const selectedPlan = data.workoutPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const steps = useMemo(() => (selectedPlan ? flattenWorkoutPlan(selectedPlan) : []), [selectedPlan]);
  const coachTimeline = useMemo(() => buildCoachTimeline(steps), [steps]);
  const currentStep = activeSession ? steps[activeSession.stepIndex] : undefined;
  const currentPhase = activeSession?.phase;
  const currentStepIndex = activeSession?.stepIndex;

  const isVoiceMuted = activeSession?.voiceMuted ?? true;

  useEffect(() => {
    return () => {
      stopTimelinePlayback();
      void cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeSession) {
      patchData({ sessionDraft: undefined });
      return;
    }
    patchData({
      sessionDraft: {
        ...activeSession,
        updatedAt: new Date().toISOString(),
      },
    });
  }, [activeSession, patchData]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'rest') {
      restCueMarksRef.current = { warned10: false, ended: false };
      void cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
      scheduledRestAlertsRef.current = null;
      return;
    }

    const restSeconds = activeSession.restRemaining;
    if (restSeconds <= 0) {
      return;
    }

    restCueMarksRef.current = { warned10: false, ended: false };
    void scheduleRestAlerts(restSeconds, data.settings.timer)
      .then((alerts) => {
        scheduledRestAlertsRef.current = alerts;
      })
      .catch(() => undefined);

    const timer = setTimeout(() => {
      setActiveSession((prev) => {
        if (!prev || prev.phase !== 'rest') {
          return prev;
        }
        const nextRemaining = Math.max(0, prev.restRemaining - 1);
        if (nextRemaining === 10 && data.settings.timer.warn10Seconds && !restCueMarksRef.current.warned10) {
          restCueMarksRef.current.warned10 = true;
          void triggerRestForegroundCue('10s', data.settings.timer);
        }
        if (nextRemaining > 0) {
          return { ...prev, restRemaining: nextRemaining, updatedAt: new Date().toISOString() };
        }

        if (!restCueMarksRef.current.ended) {
          restCueMarksRef.current.ended = true;
          void triggerRestForegroundCue('end', data.settings.timer);
        }

        const nextStepIndex = Math.min(prev.stepIndex + 1, steps.length);
        return {
          ...prev,
          stepIndex: nextStepIndex,
          phase: nextStepIndex >= steps.length ? 'done' : 'set_ready',
          restRemaining: 0,
          updatedAt: new Date().toISOString(),
        };
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeSession, steps.length, data.settings.timer]);

  useEffect(() => {
    if (!currentStep || currentPhase !== 'set_ready') {
      return;
    }
    setActiveSession((prev) => {
      if (!prev || prev.phase !== 'set_ready') {
        return prev;
      }
      return {
        ...prev,
        actualRepsInput: String(currentStep.targetReps),
        actualWeightInput: currentStep.targetWeightKg != null ? String(currentStep.targetWeightKg) : '',
        actualRpeInput: currentStep.targetRpe != null ? String(currentStep.targetRpe) : '',
        actualRirInput: currentStep.targetRir != null ? String(currentStep.targetRir) : '',
        actualTempoInput: currentStep.targetTempo ?? '',
        notesInput: '',
        updatedAt: new Date().toISOString(),
      };
    });
  }, [currentStepIndex, currentPhase, currentStep]);

  function startSession() {
    if (!selectedPlan) {
      setStatus('Selecione um plano.');
      return;
    }
    if (steps.length === 0) {
      setStatus('O plano selecionado nao possui series.');
      return;
    }
    stopTimelinePlayback();
    const draft: ActiveSession = {
      id: makeId('session'),
      workoutPlanId: selectedPlan.id,
      workoutPlanLabel: selectedPlan.dayLabel,
      startedAt: new Date().toISOString(),
      stepIndex: 0,
      phase: 'set_ready',
      restRemaining: 0,
      actualRepsInput: '',
      actualWeightInput: '',
      actualRpeInput: '',
      actualRirInput: '',
      actualTempoInput: '',
      notesInput: '',
      setLogs: [],
      voiceMuted: false,
      updatedAt: new Date().toISOString(),
    };
    setActiveSession(draft);
    setStatus('');
    setVoiceStatus('');
    if (!draft.voiceMuted) {
      startTimelinePlayback();
    }
  }

  function resumeDraft() {
    if (!data.sessionDraft) {
      return;
    }
    setSelectedPlanId(data.sessionDraft.workoutPlanId);
    setActiveSession(data.sessionDraft);
    setStatus('Rascunho retomado.');
  }

  async function discardDraft() {
    setActiveSession(null);
    await clearSessionDraft();
    setStatus('Rascunho descartado.');
  }

  function startSet() {
    setActiveSession((prev) => (prev ? { ...prev, phase: 'set_active', updatedAt: new Date().toISOString() } : prev));
  }

  function completeSet() {
    if (!activeSession || !currentStep) {
      return;
    }

    const log: SessionSetLog = {
      exerciseId: currentStep.exerciseId,
      exerciseName: currentStep.exerciseName,
      setId: currentStep.setId,
      setOrder: currentStep.setOrder,
      setType: currentStep.setType,
      targetReps: currentStep.targetReps,
      targetWeightKg: currentStep.targetWeightKg,
      targetRpe: currentStep.targetRpe,
      targetRir: currentStep.targetRir,
      targetTempo: currentStep.targetTempo,
      actualReps: parseOptionalInt(activeSession.actualRepsInput),
      actualWeightKg: parseOptionalDecimal(activeSession.actualWeightInput),
      actualRpe: parseOptionalDecimal(activeSession.actualRpeInput),
      actualRir: parseOptionalDecimal(activeSession.actualRirInput),
      actualTempo: normalizeOptionalText(activeSession.actualTempoInput),
      notes: normalizeOptionalText(activeSession.notesInput),
      completedAt: new Date().toISOString(),
    };

    const nextLogs = [...activeSession.setLogs.filter((item) => item.setId !== log.setId), log];
    const isLastStep = activeSession.stepIndex >= steps.length - 1;
    const nextPhaseIfNotDone =
      currentStep.restAfterSeconds > 0
        ? data.settings.timer.autoStartRestAfterSet
          ? 'rest'
          : 'after_set'
        : 'after_set';

    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            setLogs: nextLogs,
            phase: isLastStep ? 'done' : nextPhaseIfNotDone,
            restRemaining: !isLastStep && data.settings.timer.autoStartRestAfterSet ? currentStep.restAfterSeconds : 0,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
  }

  function startRest() {
    if (!activeSession || !currentStep) {
      return;
    }
    if (currentStep.restAfterSeconds <= 0) {
      goToNextExercise();
      return;
    }
    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            phase: 'rest',
            restRemaining: currentStep.restAfterSeconds,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
  }

  function goToNextExercise() {
    void cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
    scheduledRestAlertsRef.current = null;
    setActiveSession((prev) => {
      if (!prev) {
        return prev;
      }
      const nextStepIndex = Math.min(prev.stepIndex + 1, steps.length);
      return {
        ...prev,
        stepIndex: nextStepIndex,
        phase: nextStepIndex >= steps.length ? 'done' : 'set_ready',
        restRemaining: 0,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function finishAndSaveSession() {
    if (!activeSession) {
      return;
    }
    stopTimelinePlayback();
    await cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
    scheduledRestAlertsRef.current = null;

    const session: WorkoutSession = {
      id: activeSession.id,
      workoutPlanId: activeSession.workoutPlanId,
      workoutPlanLabel: activeSession.workoutPlanLabel,
      startedAt: activeSession.startedAt,
      endedAt: new Date().toISOString(),
      setLogs: [...activeSession.setLogs].sort((a, b) =>
        (a.completedAt ?? '').localeCompare(b.completedAt ?? '') || a.exerciseName.localeCompare(b.exerciseName),
      ),
    };

    await addSession(session);
    setActiveSession(null);
    await clearSessionDraft();
    setStatus('Sessao salva no historico.');
  }

  function toggleVoiceMute() {
    setActiveSession((prev) => {
      if (!prev) {
        return prev;
      }
      const nextMuted = !prev.voiceMuted;
      if (nextMuted) {
        stopTimelinePlayback();
      }
      return { ...prev, voiceMuted: nextMuted, updatedAt: new Date().toISOString() };
    });
    if (!activeSession) {
      setVoiceStatus('Inicie uma sessao para usar voz.');
    }
  }

  function updateActiveDraftField<K extends keyof ActiveSession>(key: K, value: ActiveSession[K]) {
    setActiveSession((prev) => (prev ? { ...prev, [key]: value, updatedAt: new Date().toISOString() } : prev));
  }

  function nudgeWeight(delta: number) {
    const current = parseOptionalDecimal(activeSession?.actualWeightInput ?? '') ?? 0;
    const next = Math.max(0, roundToOneDecimal(current + delta));
    updateActiveDraftField('actualWeightInput', next ? String(next) : '');
  }

  function nudgeReps(delta: number) {
    const current = parseOptionalInt(activeSession?.actualRepsInput ?? '') ?? 0;
    const next = Math.max(0, current + delta);
    updateActiveDraftField('actualRepsInput', next ? String(next) : '');
  }

  function startTimelinePlayback() {
    const draft = activeSession;
    if (!draft) {
      setVoiceStatus('Inicie ou retome uma sessao para reproduzir a voz.');
      return;
    }
    if (draft.voiceMuted) {
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
    setIsTimelinePlaying(true);
    setVoiceStatus('Coach de voz iniciado.');

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
          activeSession.phase === 'rest' ? 'rest' : activeSession.phase === 'done' ? 'done' : 'set',
          activeSession.restRemaining,
        )
      : 'Selecione um plano e inicie uma sessao. O texto do coach fica sempre visivel.';

  const lastTime = currentStep ? getLastTimeForExercise(data.sessions, currentStep.exerciseName) : undefined;

  return (
    <ScreenShell title="Sessao" subtitle="Rapido para usar na academia: texto + voz + draft local">
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
            onPress={toggleVoiceMute}
            variant={isVoiceMuted ? 'secondary' : 'primary'}
            disabled={!activeSession}
          />
          <PrimaryButton
            label={isTimelinePlaying ? 'Voz tocando...' : 'Reproduzir Voz'}
            onPress={startTimelinePlayback}
            variant="secondary"
            disabled={isTimelinePlaying || !activeSession}
          />
          <PrimaryButton label="Parar Voz" onPress={stopTimelinePlayback} variant="secondary" />
          <PrimaryButton
            label={showTimelinePreview ? 'Ocultar Timeline' : 'Ver Timeline'}
            onPress={() => setShowTimelinePreview((prev) => !prev)}
            variant="secondary"
          />
        </View>

        <View style={styles.rowWrap}>
          <PrimaryButton
            label={`Auto rest: ${data.settings.timer.autoStartRestAfterSet ? 'ON' : 'OFF'}`}
            onPress={() =>
              void saveSettings({
                ...data.settings,
                timer: {
                  ...data.settings.timer,
                  autoStartRestAfterSet: !data.settings.timer.autoStartRestAfterSet,
                },
              })
            }
            variant="secondary"
          />
          <PrimaryButton
            label={`Advanced: ${data.settings.session.showAdvancedSetFields ? 'ON' : 'OFF'}`}
            onPress={() =>
              void saveSettings({
                ...data.settings,
                session: {
                  ...data.settings.session,
                  showAdvancedSetFields: !data.settings.session.showAdvancedSetFields,
                },
              })
            }
            variant="secondary"
          />
        </View>

        <Text style={styles.helper}>
          Voz: {activeSession ? (isVoiceMuted ? 'mutada' : 'ativa') : 'sem sessao'} • Timeline:{' '}
          {coachTimeline.estimatedTotalSec}s • Cues: {coachTimeline.cues.length}
        </Text>
        {voiceStatus ? <Text style={styles.status}>{voiceStatus}</Text> : null}

        {!activeSession && data.sessionDraft ? (
          <View style={styles.resumeBox}>
            <Text style={styles.sectionTitle}>Rascunho encontrado</Text>
            <Text style={styles.helper}>
              {data.sessionDraft.workoutPlanLabel} • {new Date(data.sessionDraft.startedAt).toLocaleString('pt-BR')}
            </Text>
            <View style={styles.rowWrap}>
              <PrimaryButton label="Retomar Rascunho" onPress={resumeDraft} />
              <PrimaryButton label="Descartar" onPress={() => void discardDraft()} variant="danger" />
            </View>
          </View>
        ) : null}

        <SessionContent
          styles={styles}
          session={activeSession}
          step={currentStep}
          coachText={coachText}
          lastTime={lastTime}
          quickAdjust={data.settings.quickAdjust}
          showAdvanced={data.settings.session.showAdvancedSetFields}
          onStartSession={startSession}
          onStartSet={startSet}
          onCompleteSet={completeSet}
          onStartRest={startRest}
          onNextExercise={goToNextExercise}
          onFinish={finishAndSaveSession}
          onDiscardDraft={discardDraft}
          onChangeReps={(v) => updateActiveDraftField('actualRepsInput', v)}
          onChangeWeight={(v) => updateActiveDraftField('actualWeightInput', v)}
          onChangeRpe={(v) => updateActiveDraftField('actualRpeInput', v)}
          onChangeRir={(v) => updateActiveDraftField('actualRirInput', v)}
          onChangeTempo={(v) => updateActiveDraftField('actualTempoInput', v)}
          onChangeNotes={(v) => updateActiveDraftField('notesInput', v)}
          onNudgeWeight={nudgeWeight}
          onNudgeReps={nudgeReps}
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

interface SessionContentProps {
  styles: ReturnType<typeof createStyles>;
  session: ActiveSession | null;
  step?: RunnerStep;
  coachText: string;
  lastTime?: string;
  quickAdjust: {
    weightStepSmallKg: number;
    weightStepLargeKg: number;
    repStep: number;
  };
  showAdvanced: boolean;
  onStartSession: () => void;
  onStartSet: () => void;
  onCompleteSet: () => void;
  onStartRest: () => void;
  onNextExercise: () => void;
  onFinish: () => void;
  onDiscardDraft: () => Promise<void>;
  onChangeReps: (value: string) => void;
  onChangeWeight: (value: string) => void;
  onChangeRpe: (value: string) => void;
  onChangeRir: (value: string) => void;
  onChangeTempo: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onNudgeWeight: (delta: number) => void;
  onNudgeReps: (delta: number) => void;
}

function SessionContent({
  styles,
  session,
  step,
  coachText,
  lastTime,
  quickAdjust,
  showAdvanced,
  onStartSession,
  onStartSet,
  onCompleteSet,
  onStartRest,
  onNextExercise,
  onFinish,
  onDiscardDraft,
  onChangeReps,
  onChangeWeight,
  onChangeRpe,
  onChangeRir,
  onChangeTempo,
  onChangeNotes,
  onNudgeWeight,
  onNudgeReps,
}: SessionContentProps) {
  return (
    <View style={styles.readWrap}>
      <View style={styles.coachBox}>
        <Text style={styles.coachTitle}>Coach (pt-BR)</Text>
        <Text style={styles.coachText}>{coachText}</Text>
      </View>

      {!session ? (
        <PrimaryButton label="Iniciar Sessao" onPress={onStartSession} />
      ) : (
        <>
          <Text style={styles.helper}>
            Sessao ativa: {session.workoutPlanLabel} • Fase: {session.phase.toUpperCase()}
          </Text>
          <Text style={styles.helper}>Series registradas: {session.setLogs.length}</Text>

          {step ? (
            <View style={styles.setEditor}>
              <Text style={styles.sectionTitle}>{step.exerciseName}</Text>
              <Text style={styles.helper}>
                Serie {step.setOrder}/{step.exerciseSetCount} • Tipo {step.setType ?? 'working'} • Alvo {step.targetReps}
                {step.targetWeightKg != null ? ` reps/${step.targetWeightKg}kg` : ' reps'}
                {step.supersetGroupId ? ` • Superset ${step.supersetGroupId}` : ''}
                {step.dropSetGroupId ? ` • Drop ${step.dropSetGroupId}` : ''}
              </Text>
              {lastTime ? <Text style={styles.lastTime}>Ultima vez: {lastTime}</Text> : null}

              <View style={styles.rowWrap}>
                {session.phase === 'set_ready' ? (
                  <>
                    <PrimaryButton label="Start Set" onPress={onStartSet} />
                    <PrimaryButton label="Next Exercise" onPress={onNextExercise} variant="secondary" />
                  </>
                ) : null}
                {session.phase === 'after_set' ? (
                  <>
                    <PrimaryButton label="Start Rest" onPress={onStartRest} />
                    <PrimaryButton label="Next Exercise" onPress={onNextExercise} variant="secondary" />
                  </>
                ) : null}
              </View>

              {(session.phase === 'set_active' || session.phase === 'after_set') && (
                <>
                  <View style={styles.rowTwo}>
                    <View style={styles.half}>
                      <FormField
                        label="Reps"
                        value={session.actualRepsInput}
                        onChangeText={onChangeReps}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.half}>
                      <FormField
                        label="Peso (kg)"
                        value={session.actualWeightInput}
                        onChangeText={onChangeWeight}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.rowWrap}>
                    <PrimaryButton label={`+${quickAdjust.weightStepSmallKg}kg`} onPress={() => onNudgeWeight(quickAdjust.weightStepSmallKg)} />
                    <PrimaryButton label={`+${quickAdjust.weightStepLargeKg}kg`} onPress={() => onNudgeWeight(quickAdjust.weightStepLargeKg)} variant="secondary" />
                    <PrimaryButton label={`-${quickAdjust.weightStepSmallKg}kg`} onPress={() => onNudgeWeight(-quickAdjust.weightStepSmallKg)} variant="secondary" />
                    <PrimaryButton label={`+${quickAdjust.repStep} rep`} onPress={() => onNudgeReps(quickAdjust.repStep)} variant="secondary" />
                    <PrimaryButton label={`-${quickAdjust.repStep} rep`} onPress={() => onNudgeReps(-quickAdjust.repStep)} variant="secondary" />
                  </View>

                  {showAdvanced ? (
                    <View style={styles.advancedBox}>
                      <View style={styles.rowTwo}>
                        <View style={styles.half}>
                          <FormField
                            label="RPE (opcional)"
                            value={session.actualRpeInput}
                            onChangeText={onChangeRpe}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.half}>
                          <FormField
                            label="RIR (opcional)"
                            value={session.actualRirInput}
                            onChangeText={onChangeRir}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      <FormField
                        label="Tempo (opcional)"
                        value={session.actualTempoInput}
                        onChangeText={onChangeTempo}
                        placeholder="Ex.: 3010"
                      />
                      <FormField
                        label="Notas da serie"
                        value={session.notesInput}
                        onChangeText={onChangeNotes}
                        placeholder="Observacoes rapidas"
                      />
                    </View>
                  ) : null}

                  {session.phase === 'set_active' ? (
                    <PrimaryButton label="Complete Set" onPress={onCompleteSet} />
                  ) : null}
                </>
              )}
            </View>
          ) : null}

          {session.phase === 'rest' ? (
            <View style={styles.restBox}>
              <Text style={styles.restLabel}>Descanso</Text>
              <Text style={styles.restTime}>{session.restRemaining}s</Text>
              <View style={styles.rowWrap}>
                <PrimaryButton label="Start Set" onPress={onNextExercise} />
                <PrimaryButton label="Next Exercise" onPress={onNextExercise} variant="secondary" />
              </View>
            </View>
          ) : null}

          {session.phase === 'done' ? (
            <View style={styles.rowWrap}>
              <PrimaryButton label="Finalizar e Salvar Sessao" onPress={onFinish} />
              <PrimaryButton label="Descartar Rascunho" onPress={() => void onDiscardDraft()} variant="danger" />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function getLastTimeForExercise(sessions: WorkoutSession[], exerciseName: string): string | undefined {
  for (const session of sessions) {
    const logs = session.setLogs.filter((log) => log.exerciseName === exerciseName);
    if (logs.length === 0) {
      continue;
    }
    const last = logs[logs.length - 1];
    return `${last.actualReps ?? last.targetReps} reps @ ${last.actualWeightKg ?? last.targetWeightKg ?? '-'} kg`;
  }
  return undefined;
}

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
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

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
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
    lastTime: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: '600',
    },
    advancedBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      backgroundColor: colors.surface,
      gap: 8,
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
    resumeBox: {
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      padding: 12,
      gap: 8,
    },
  });
}
