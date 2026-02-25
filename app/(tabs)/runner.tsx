import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Speech from 'expo-speech';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useI18n } from '@/src/i18n/useI18n';
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
  const { data, addSession, clearSessionDraft, saveSessionDraft, saveSettings } = useAppStore();
  const { colors } = useAppTheme();
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [status, setStatus] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [showTimelinePreview, setShowTimelinePreview] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const setVoiceTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduledRestAlertsRef = useRef<ScheduledRestAlerts | null>(null);
  const restCueMarksRef = useRef<{ warned10: boolean; ended: boolean }>({ warned10: false, ended: false });
  const restNotificationsKeyRef = useRef<string | null>(null);
  const lastPersistedDraftKeyRef = useRef<string | null>(null);

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
      const normalizedDraft = normalizeDraft(data.sessionDraft);
      setActiveSession(normalizedDraft);
      setSelectedPlanId(normalizedDraft.workoutPlanId);
    }
    setDraftHydrated(true);
  }, [data.sessionDraft, draftHydrated]);

  const selectedPlan = data.workoutPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const steps = useMemo(() => (selectedPlan ? flattenWorkoutPlan(selectedPlan) : []), [selectedPlan]);
  const coachTimeline = useMemo(() => buildCoachTimeline(steps), [steps]);
  const currentStep = activeSession ? steps[activeSession.stepIndex] : undefined;
  const currentPhase = activeSession?.phase;
  const currentStepIndex = activeSession?.stepIndex;
  const currentSetElapsedSeconds = activeSession?.setElapsedSeconds;

  const isVoiceMuted = activeSession?.voiceMuted ?? true;

  useEffect(() => {
    return () => {
      stopSetVoicePlayback();
      void cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeSession) {
      if (lastPersistedDraftKeyRef.current === null) {
        return;
      }
      lastPersistedDraftKeyRef.current = null;
      void clearSessionDraft();
      return;
    }
    const draftToPersist = {
      ...activeSession,
      updatedAt: activeSession.updatedAt ?? new Date().toISOString(),
    };
    const persistKey = JSON.stringify(draftToPersist);
    if (lastPersistedDraftKeyRef.current === persistKey) {
      return;
    }
    lastPersistedDraftKeyRef.current = persistKey;
    void saveSessionDraft(draftToPersist);
  }, [activeSession, clearSessionDraft, saveSessionDraft]);

  useEffect(() => {
    if (currentPhase !== 'rest') {
      restCueMarksRef.current = { warned10: false, ended: false };
      restNotificationsKeyRef.current = null;
      void cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
      scheduledRestAlertsRef.current = null;
      return;
    }
  }, [currentPhase]);

  useEffect(() => {
    if (!activeSession || activeSession.phase !== 'rest') {
      return;
    }
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
    if (currentPhase !== 'set_active') {
      return;
    }
    const timer = setTimeout(() => {
      setActiveSession((prev) =>
        prev && prev.phase === 'set_active'
          ? { ...prev, setElapsedSeconds: prev.setElapsedSeconds + 1, updatedAt: new Date().toISOString() }
          : prev,
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentPhase, currentSetElapsedSeconds]);

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
        setElapsedSeconds: 0,
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
    stopSetVoicePlayback();
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
      setElapsedSeconds: 0,
      setLogs: [],
      voiceMuted: false,
      updatedAt: new Date().toISOString(),
    };
    setActiveSession(draft);
    setStatus('');
    setVoiceStatus('');
  }

  function resumeDraft() {
    if (!data.sessionDraft) {
      return;
    }
    const normalizedDraft = normalizeDraft(data.sessionDraft);
    setSelectedPlanId(normalizedDraft.workoutPlanId);
    setActiveSession(normalizedDraft);
    setStatus('Rascunho retomado.');
  }

  async function discardDraft() {
    stopSetVoicePlayback();
    setActiveSession(null);
    await clearSessionDraft();
    setStatus('Rascunho descartado.');
  }

  function startSet() {
    if (!currentStep) {
      return;
    }
    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            phase: 'set_active',
            setElapsedSeconds: 0,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
    startSetVoicePlayback(currentStep, 0);
  }

  function completeSet() {
    if (!activeSession || !currentStep) {
      return;
    }
    stopSetVoicePlayback();

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

    const nextRestSeconds =
      !isLastStep && data.settings.timer.autoStartRestAfterSet ? currentStep.restAfterSeconds : 0;

    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            setLogs: nextLogs,
            phase: isLastStep ? 'done' : nextPhaseIfNotDone,
            restRemaining: nextRestSeconds,
            setElapsedSeconds: 0,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );

    if (isLastStep) {
      speakIfAllowed(lang === 'en' ? 'Great job! Workout completed.' : 'Mandou bem! Treino concluido.');
      return;
    }

    if (nextPhaseIfNotDone === 'rest' && nextRestSeconds > 0) {
      void rescheduleRestAlerts(nextRestSeconds);
      speakIfAllowed(
        lang === 'en'
          ? `Great job! Rest for ${nextRestSeconds} seconds.`
          : `Mandou bem! Descanse por ${nextRestSeconds} segundos.`,
      );
    } else {
      speakIfAllowed(lang === 'en' ? 'Great job! Ready for the next set.' : 'Mandou bem! Prepare a proxima serie.');
    }
  }

  function startRest() {
    if (!activeSession || !currentStep) {
      return;
    }
    if (currentStep.restAfterSeconds <= 0) {
      goToNextExercise();
      return;
    }
    stopSetVoicePlayback();
    void rescheduleRestAlerts(currentStep.restAfterSeconds);
    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            phase: 'rest',
            restRemaining: currentStep.restAfterSeconds,
            setElapsedSeconds: 0,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
    speakIfAllowed(
      lang === 'en'
        ? `Great job! Rest for ${currentStep.restAfterSeconds} seconds.`
        : `Mandou bem! Descanse por ${currentStep.restAfterSeconds} segundos.`,
    );
  }

  function goToNextExercise() {
    stopSetVoicePlayback();
    void cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
    scheduledRestAlertsRef.current = null;
    restNotificationsKeyRef.current = null;
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
        setElapsedSeconds: 0,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async function finishAndSaveSession() {
    if (!activeSession) {
      return;
    }
    stopSetVoicePlayback();
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
        stopSetVoicePlayback();
      } else if (prev.phase === 'set_active' && currentStep) {
        // Resume per-set cues from the current execution timer position.
        startSetVoicePlayback(currentStep, prev.setElapsedSeconds);
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

  async function rescheduleRestAlerts(restSeconds: number) {
    const key = `${activeSession?.id ?? 'none'}:${activeSession?.stepIndex ?? -1}:${restSeconds}`;
    if (restNotificationsKeyRef.current === key) {
      return;
    }
    restNotificationsKeyRef.current = key;
    await cancelScheduledRestAlerts(scheduledRestAlertsRef.current);
    scheduledRestAlertsRef.current = null;
    if (restSeconds <= 0) {
      return;
    }
    try {
      scheduledRestAlertsRef.current = await scheduleRestAlerts(restSeconds, data.settings.timer);
    } catch {
      // keep silent in the MVP; notification permissions vary across devices.
    }
  }

  function adjustRest(deltaSeconds: number) {
    setActiveSession((prev) => {
      if (!prev || prev.phase !== 'rest') {
        return prev;
      }
      const next = Math.max(0, prev.restRemaining + deltaSeconds);
      void rescheduleRestAlerts(next);
      return { ...prev, restRemaining: next, updatedAt: new Date().toISOString() };
    });
  }

  function startSetVoicePlayback(step: RunnerStep, fromElapsedSec: number) {
    if (!activeSession || activeSession.voiceMuted) {
      return;
    }
    stopSetVoicePlayback();
    const cues = buildSetVoiceCues(step, lang);
    const remainingCues = cues.filter((cue) => cue.atSec >= fromElapsedSec);
    if (remainingCues.length === 0) {
      return;
    }
    setVoiceStatus(lang === 'en' ? 'Voice following the current set.' : 'Voz acompanhando a serie atual.');
    remainingCues.forEach((cue) => {
      const timeout = setTimeout(() => {
        Speech.speak(cue.text, {
          language: lang,
          rate: 0.95,
          pitch: 1,
        });
      }, Math.max(0, cue.atSec - fromElapsedSec) * 1000);
      setVoiceTimeoutsRef.current.push(timeout);
    });
  }

  function stopSetVoicePlayback() {
    setVoiceTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    setVoiceTimeoutsRef.current = [];
    Speech.stop();
  }

  function speakIfAllowed(text: string) {
    if (!activeSession || activeSession.voiceMuted) {
      return;
    }
    Speech.speak(text, { language: lang, rate: 0.95, pitch: 1 });
  }

  const coachText =
    activeSession && currentStep
      ? getReadCoachText(
          currentStep,
          activeSession.phase === 'rest' ? 'rest' : activeSession.phase === 'done' ? 'done' : 'set',
          activeSession.restRemaining,
        )
      : lang === 'en'
        ? 'Select a plan and start a session. Coach text stays visible all the time.'
        : 'Selecione um plano e inicie uma sessao. O texto do coach fica sempre visivel.';

  const lastTime = currentStep ? getLastTimeForExercise(data.sessions, currentStep.exerciseName) : undefined;

  return (
    <ScreenShell title={t('runner.title')} subtitle={t('runner.subtitle')}>
      <View style={styles.card}>
        <Text style={styles.label}>{lang === 'en' ? 'Workout plan' : 'Plano de treino'}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedPlanId ?? ''}
            style={{ color: colors.text }}
            dropdownIconColor={colors.accent}
            onValueChange={(value) => setSelectedPlanId(String(value))}
          >
            <Picker.Item label={lang === 'en' ? 'Select a plan' : 'Selecione um plano'} value="" />
            {data.workoutPlans.map((plan) => (
              <Picker.Item key={plan.id} label={plan.dayLabel} value={plan.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.rowWrap}>
          <PrimaryButton
            label={isVoiceMuted ? t('runner.unmuteVoice') : t('runner.muteVoice')}
            onPress={toggleVoiceMute}
            variant={isVoiceMuted ? 'secondary' : 'primary'}
            disabled={!activeSession}
            size="compact"
          />
          <PrimaryButton
            label={showTimelinePreview ? t('runner.hideTimeline') : t('runner.showTimeline')}
            onPress={() => setShowTimelinePreview((prev) => !prev)}
            variant="secondary"
            size="compact"
          />
        </View>

        <View style={styles.rowWrap}>
          <PrimaryButton
            label={`${lang === 'en' ? 'Auto rest' : 'Auto descanso'}: ${data.settings.timer.autoStartRestAfterSet ? 'ON' : 'OFF'}`}
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
            size="compact"
          />
          <PrimaryButton
            label={`${lang === 'en' ? 'Advanced' : 'Avancado'}: ${data.settings.session.showAdvancedSetFields ? 'ON' : 'OFF'}`}
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
            size="compact"
          />
        </View>

        <Text style={styles.helper}>
          {lang === 'en' ? 'Voice' : 'Voz'}: {activeSession ? (isVoiceMuted ? (lang === 'en' ? 'muted' : 'mutada') : (lang === 'en' ? 'active' : 'ativa')) : (lang === 'en' ? 'no session' : 'sem sessao')} • Timeline:{' '}
          {coachTimeline.estimatedTotalSec}s • Cues: {coachTimeline.cues.length}
        </Text>
        {voiceStatus ? <Text style={styles.status}>{voiceStatus}</Text> : null}

        {!activeSession && data.sessionDraft ? (
          <View style={styles.resumeBox}>
            <Text style={styles.sectionTitle}>{lang === 'en' ? 'Draft found' : 'Rascunho encontrado'}</Text>
            <Text style={styles.helper}>
              {data.sessionDraft.workoutPlanLabel} • {new Date(data.sessionDraft.startedAt).toLocaleString('pt-BR')}
            </Text>
            <View style={styles.rowWrap}>
              <PrimaryButton
                label={lang === 'en' ? 'Resume Draft' : 'Retomar Rascunho'}
                onPress={resumeDraft}
                size="compact"
              />
              <PrimaryButton
                label={lang === 'en' ? 'Discard' : 'Descartar'}
                onPress={() => void discardDraft()}
                variant="danger"
                size="compact"
              />
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
          lang={lang}
          onStartSession={startSession}
          onStartSet={startSet}
          onCompleteSet={completeSet}
          onStartRest={startRest}
          onNextExercise={goToNextExercise}
          onFinish={finishAndSaveSession}
          onDiscardDraft={discardDraft}
          onAdjustRest={adjustRest}
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
  lang: 'pt-BR' | 'en';
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
  onAdjustRest: (deltaSeconds: number) => void;
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
  lang,
  quickAdjust,
  showAdvanced,
  onStartSession,
  onStartSet,
  onCompleteSet,
  onStartRest,
  onNextExercise,
  onFinish,
  onDiscardDraft,
  onAdjustRest,
  onChangeReps,
  onChangeWeight,
  onChangeRpe,
  onChangeRir,
  onChangeTempo,
  onChangeNotes,
  onNudgeWeight,
  onNudgeReps,
}: SessionContentProps) {
  const [showSetEditor, setShowSetEditor] = useState(false);
  useEffect(() => {
    setShowSetEditor(false);
  }, [session?.stepIndex, session?.phase]);

  const text = {
    coach: lang === 'en' ? 'Coach' : 'Coach (pt-BR)',
    startSession: lang === 'en' ? 'Start Session' : 'Iniciar Sessao',
    activeSession: lang === 'en' ? 'Active session' : 'Sessao ativa',
    phase: lang === 'en' ? 'Phase' : 'Fase',
    loggedSets: lang === 'en' ? 'Logged sets' : 'Series registradas',
    lastTime: lang === 'en' ? 'Last time' : 'Ultima vez',
    executionTimer: lang === 'en' ? 'Execution timer' : 'Timer de execucao',
    startSet: lang === 'en' ? 'Start Set' : 'Iniciar Serie',
    completeSet: lang === 'en' ? 'Complete Set' : 'Concluir Serie',
    startRest: lang === 'en' ? 'Start Rest' : 'Iniciar Descanso',
    nextExercise: lang === 'en' ? 'Next Exercise' : 'Proximo Exercicio',
    rest: lang === 'en' ? 'Rest' : 'Descanso',
    finishSave: lang === 'en' ? 'Finish & Save Session' : 'Finalizar e Salvar Sessao',
    discardDraft: lang === 'en' ? 'Discard Draft' : 'Descartar Rascunho',
    editValues: lang === 'en' ? 'Edit reps/weight' : 'Editar reps/peso',
    hideValues: lang === 'en' ? 'Hide reps/weight' : 'Ocultar reps/peso',
    changeExercise: lang === 'en' ? 'Change exercise' : 'Trocar exercicio',
  } as const;

  return (
    <View style={styles.readWrap}>
      <View style={styles.coachBox}>
        <Text style={styles.coachTitle}>{text.coach}</Text>
        <Text style={styles.coachText}>{coachText}</Text>
      </View>

      {!session ? (
        <PrimaryButton label={text.startSession} onPress={onStartSession} />
      ) : (
        <>
          <Text style={styles.helper}>
            {text.activeSession}: {session.workoutPlanLabel} • {text.phase}: {session.phase.toUpperCase()}
          </Text>
          <Text style={styles.helper}>
            {text.loggedSets}: {session.setLogs.length}
          </Text>

          {step ? (
            <View style={styles.setEditor}>
              <Text style={styles.sectionTitle}>{step.exerciseName}</Text>
              <Pressable onPress={onNextExercise}>
                <Text style={styles.linkText}>{text.changeExercise}</Text>
              </Pressable>
              <Text style={styles.helper}>
                Serie {step.setOrder}/{step.exerciseSetCount} • Tipo {step.setType ?? 'working'} • Alvo{' '}
                {step.targetReps}
                {step.targetWeightKg != null ? ` reps/${step.targetWeightKg}kg` : ' reps'}
                {step.supersetGroupId ? ` • Superset ${step.supersetGroupId}` : ''}
                {step.dropSetGroupId ? ` • Drop ${step.dropSetGroupId}` : ''}
              </Text>
              {lastTime ? (
                <Text style={styles.lastTime}>
                  {text.lastTime}: {lastTime}
                </Text>
              ) : null}
              {session.phase === 'set_active' ? (
                <Text style={styles.executionTimer}>
                  {text.executionTimer}: {session.setElapsedSeconds}s
                </Text>
              ) : null}

              <View style={styles.rowWrap}>
                {session.phase === 'set_ready' ? (
                  <>
                    <PrimaryButton label={text.startSet} onPress={onStartSet} size="compact" />
                    <PrimaryButton
                      label={text.nextExercise}
                      onPress={onNextExercise}
                      variant="secondary"
                      size="compact"
                    />
                  </>
                ) : null}
                {session.phase === 'after_set' ? (
                  <>
                    <PrimaryButton label={text.startRest} onPress={onStartRest} size="compact" />
                    <PrimaryButton
                      label={text.nextExercise}
                      onPress={onNextExercise}
                      variant="secondary"
                      size="compact"
                    />
                  </>
                ) : null}
              </View>

              {(session.phase === 'set_active' || session.phase === 'after_set') && (
                <>
                  <Pressable onPress={() => setShowSetEditor((prev) => !prev)}>
                    <Text style={styles.linkText}>{showSetEditor ? text.hideValues : text.editValues}</Text>
                  </Pressable>

                  {showSetEditor ? (
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
                        label={lang === 'en' ? 'Weight (kg)' : 'Peso (kg)'}
                        value={session.actualWeightInput}
                        onChangeText={onChangeWeight}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.rowWrap}>
                    <PrimaryButton
                      label={`+${quickAdjust.weightStepSmallKg}kg`}
                      onPress={() => onNudgeWeight(quickAdjust.weightStepSmallKg)}
                      size="compact"
                    />
                    <PrimaryButton
                      label={`+${quickAdjust.weightStepLargeKg}kg`}
                      onPress={() => onNudgeWeight(quickAdjust.weightStepLargeKg)}
                      variant="secondary"
                      size="compact"
                    />
                    <PrimaryButton
                      label={`-${quickAdjust.weightStepSmallKg}kg`}
                      onPress={() => onNudgeWeight(-quickAdjust.weightStepSmallKg)}
                      variant="secondary"
                      size="compact"
                    />
                    <PrimaryButton
                      label={`+${quickAdjust.repStep} rep`}
                      onPress={() => onNudgeReps(quickAdjust.repStep)}
                      variant="secondary"
                      size="compact"
                    />
                    <PrimaryButton
                      label={`-${quickAdjust.repStep} rep`}
                      onPress={() => onNudgeReps(-quickAdjust.repStep)}
                      variant="secondary"
                      size="compact"
                    />
                  </View>

                  {showAdvanced ? (
                    <View style={styles.advancedBox}>
                      <View style={styles.rowTwo}>
                        <View style={styles.half}>
                          <FormField
                            label={lang === 'en' ? 'RPE (optional)' : 'RPE (opcional)'}
                            value={session.actualRpeInput}
                            onChangeText={onChangeRpe}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.half}>
                          <FormField
                            label={lang === 'en' ? 'RIR (optional)' : 'RIR (opcional)'}
                            value={session.actualRirInput}
                            onChangeText={onChangeRir}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      <FormField
                        label={lang === 'en' ? 'Tempo (optional)' : 'Tempo (opcional)'}
                        value={session.actualTempoInput}
                        onChangeText={onChangeTempo}
                        placeholder={lang === 'en' ? 'Ex.: 3010' : 'Ex.: 3010'}
                      />
                      <FormField
                        label={lang === 'en' ? 'Set notes' : 'Notas da serie'}
                        value={session.notesInput}
                        onChangeText={onChangeNotes}
                        placeholder={lang === 'en' ? 'Quick notes' : 'Observacoes rapidas'}
                      />
                    </View>
                  ) : null}
                    </>
                  ) : null}

                  {session.phase === 'set_active' ? (
                    <PrimaryButton label={text.completeSet} onPress={onCompleteSet} size="large" />
                  ) : null}
                </>
              )}
            </View>
          ) : null}

          {session.phase === 'rest' ? (
            <View style={styles.restBox}>
              <Text style={styles.restLabel}>{text.rest}</Text>
              <Text style={styles.restTime}>{session.restRemaining}s</Text>
              <View style={styles.rowWrap}>
                <PrimaryButton label="+10s" onPress={() => onAdjustRest(10)} variant="secondary" size="compact" />
                <PrimaryButton label="+30s" onPress={() => onAdjustRest(30)} variant="secondary" size="compact" />
                <PrimaryButton label="-10s" onPress={() => onAdjustRest(-10)} variant="secondary" size="compact" />
              </View>
              <View style={styles.rowWrap}>
                <PrimaryButton label={text.startSet} onPress={onNextExercise} size="compact" />
                <PrimaryButton label={text.nextExercise} onPress={onNextExercise} variant="secondary" size="compact" />
              </View>
            </View>
          ) : null}

          {session.phase === 'done' ? (
            <View style={styles.rowWrap}>
              <PrimaryButton label={text.finishSave} onPress={onFinish} />
              <PrimaryButton label={text.discardDraft} onPress={() => void onDiscardDraft()} variant="danger" size="compact" />
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

function normalizeDraft(draft: SessionDraft): SessionDraft {
  return {
    ...draft,
    setElapsedSeconds: typeof draft.setElapsedSeconds === 'number' ? draft.setElapsedSeconds : 0,
  };
}

function buildSetVoiceCues(step: RunnerStep, lang: 'pt-BR' | 'en'): { atSec: number; text: string }[] {
  const start =
    lang === 'en'
      ? `Start ${step.exerciseName}. Target ${step.targetReps} reps${step.targetWeightKg != null ? ` at ${step.targetWeightKg} kilos` : ''}.`
      : `Comece ${step.exerciseName}. Meta de ${step.targetReps} reps${step.targetWeightKg != null ? ` com ${step.targetWeightKg} quilos` : ''}.`;
  const weightReminder =
    step.targetWeightKg == null
      ? null
      : {
          atSec: 2,
          text:
            lang === 'en'
              ? `Keep the load at ${step.targetWeightKg} kilos.`
              : `Mantenha a carga em ${step.targetWeightKg} quilos.`,
        };
  const encouragement = {
    atSec: Math.max(6, Math.min(14, Math.round(step.targetReps * 1.5))),
    text: lang === 'en' ? 'Nice pace. Keep control.' : 'Bom ritmo. Mantem o controle.',
  };

  return [{ atSec: 0, text: start }, ...(weightReminder ? [weightReminder] : []), encouragement];
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
      padding: 12,
      gap: 8,
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
      gap: 6,
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
    linkText: {
      fontSize: 12,
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    helper: {
      fontSize: 12,
      color: colors.textMuted,
    },
    setEditor: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 8,
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
    executionTimer: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '700',
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
