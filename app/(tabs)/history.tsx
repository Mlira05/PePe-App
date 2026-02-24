import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import {
  getExercisePrStats,
  getExerciseVolumeStats,
  getSessionVolumeSeries,
  getWeeklyTrainingStats,
} from '@/src/lib/analytics';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { WorkoutSession } from '@/src/types/models';

type RangeFilter = '7d' | '30d' | 'all';
type ViewFilter = 'overview' | 'sessions' | 'prs';

export default function AnalyticsScreen() {
  const { data } = useAppStore();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [range, setRange] = useState<RangeFilter>('30d');
  const [view, setView] = useState<ViewFilter>('overview');

  const filteredSessions = useMemo(() => applyRangeFilter(data.sessions, range), [data.sessions, range]);
  const weeklyStats = getWeeklyTrainingStats(filteredSessions).slice(0, 8);
  const volumeStats = getExerciseVolumeStats(filteredSessions).slice(0, 10);
  const prStats = getExercisePrStats(filteredSessions).slice(0, 12);
  const sessionSeries = getSessionVolumeSeries(filteredSessions).slice(-12);

  return (
    <ScreenShell title="Analytics" subtitle="Historico, filtros e progressao">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Filtros</Text>
        <View style={styles.row}>
          <PrimaryButton
            label="7 dias"
            onPress={() => setRange('7d')}
            variant={range === '7d' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label="30 dias"
            onPress={() => setRange('30d')}
            variant={range === '30d' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label="Tudo"
            onPress={() => setRange('all')}
            variant={range === 'all' ? 'primary' : 'secondary'}
          />
        </View>
        <View style={styles.row}>
          <PrimaryButton
            label="Overview"
            onPress={() => setView('overview')}
            variant={view === 'overview' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label="Sessoes"
            onPress={() => setView('sessions')}
            variant={view === 'sessions' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label="PRs"
            onPress={() => setView('prs')}
            variant={view === 'prs' ? 'primary' : 'secondary'}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        <Text style={styles.helper}>Sessoes filtradas: {filteredSessions.length}</Text>
        <Text style={styles.helper}>
          Ultima sessao: {filteredSessions[0] ? formatDateTime(filteredSessions[0].startedAt) : 'nenhuma'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Grafico de progressao (volume por sessao)</Text>
        {sessionSeries.length === 0 ? (
          <Text style={styles.helper}>Sem dados no periodo selecionado.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartRow}>
              {renderBars(sessionSeries, styles, colors)}
            </View>
          </ScrollView>
        )}
      </View>

      {(view === 'overview' || view === 'sessions') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dias treinados por semana</Text>
          {weeklyStats.length === 0 ? (
            <Text style={styles.helper}>Sem sessoes ainda.</Text>
          ) : (
            weeklyStats.map((item) => (
              <View key={item.weekKey} style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{item.weekKey}</Text>
                <Text style={styles.rowValue}>{item.daysTrained} dia(s)</Text>
              </View>
            ))
          )}
        </View>
      )}

      {(view === 'overview' || view === 'sessions') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Volume total por exercicio</Text>
          {volumeStats.length === 0 ? (
            <Text style={styles.helper}>Sem volume calculavel ainda.</Text>
          ) : (
            volumeStats.map((item) => (
              <View key={item.exerciseName} style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{item.exerciseName}</Text>
                <Text style={styles.rowValue}>{Math.round(item.totalVolume)} kg</Text>
              </View>
            ))
          )}
        </View>
      )}

      {(view === 'overview' || view === 'prs') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PRs simples</Text>
          {prStats.length === 0 ? (
            <Text style={styles.helper}>Sem PRs detectados ainda.</Text>
          ) : (
            prStats.map((item) => (
              <View key={item.exerciseName} style={styles.prCard}>
                <Text style={styles.rowLabel}>{item.exerciseName}</Text>
                <Text style={styles.helper}>Max weight: {item.maxWeightKg ?? '-'} kg</Text>
                <Text style={styles.helper}>
                  Best reps @ weight:{' '}
                  {item.bestRepsAtWeight
                    ? `${item.bestRepsAtWeight.reps} reps @ ${item.bestRepsAtWeight.weightKg} kg`
                    : '-'}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {(view === 'overview' || view === 'sessions') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Historico de sessoes</Text>
          {filteredSessions.length === 0 ? (
            <Text style={styles.helper}>Nenhuma sessao no filtro atual.</Text>
          ) : (
            filteredSessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <Text style={styles.sessionTitle}>{session.workoutPlanLabel}</Text>
                <Text style={styles.helper}>
                  {formatDateTime(session.startedAt)} • {session.setLogs.length} serie(s)
                </Text>
                <Text style={styles.helper}>
                  Fim: {session.endedAt ? formatDateTime(session.endedAt) : 'em aberto'}
                </Text>
                <View style={styles.logList}>
                  {session.setLogs.slice(0, 8).map((log) => (
                    <Text key={`${session.id}-${log.setId}`} style={styles.logLine}>
                      • {log.exerciseName} S{log.setOrder}: {log.actualReps ?? '-'} reps / {log.actualWeightKg ?? '-'} kg
                    </Text>
                  ))}
                  {session.setLogs.length > 8 ? (
                    <Text style={styles.logLine}>... +{session.setLogs.length - 8} registros</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScreenShell>
  );
}

function applyRangeFilter(sessions: WorkoutSession[], range: RangeFilter): WorkoutSession[] {
  if (range === 'all') {
    return sessions;
  }
  const days = range === '7d' ? 7 : 30;
  const minTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((session) => new Date(session.startedAt).getTime() >= minTime);
}

function renderBars(
  series: ReturnType<typeof getSessionVolumeSeries>,
  styles: ReturnType<typeof createStyles>,
  colors: ReturnType<typeof useAppTheme>['colors'],
) {
  const max = Math.max(...series.map((point) => point.volume), 1);
  return series.map((point) => {
    const height = Math.max(12, Math.round((point.volume / max) * 120));
    return (
      <View key={point.sessionId} style={styles.barItem}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                height,
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
              },
            ]}
          />
        </View>
        <Text style={styles.barValue}>{point.volume}</Text>
        <Text style={styles.barLabel}>{point.label}</Text>
      </View>
    );
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR');
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    helper: {
      fontSize: 13,
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      alignItems: 'center',
    },
    rowLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    rowValue: {
      fontSize: 13,
      color: colors.textMuted,
    },
    prCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 2,
      backgroundColor: colors.surfaceAlt,
    },
    sessionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      padding: 10,
      gap: 4,
    },
    sessionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    logList: {
      marginTop: 4,
      gap: 2,
    },
    logLine: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
    },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingTop: 8,
      paddingRight: 12,
    },
    barItem: {
      alignItems: 'center',
      gap: 4,
      width: 44,
    },
    barTrack: {
      height: 124,
      width: 18,
      borderRadius: 9,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'flex-end',
      padding: 2,
    },
    barFill: {
      width: '100%',
      borderRadius: 6,
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 1,
    },
    barValue: {
      fontSize: 10,
      color: colors.text,
      fontWeight: '700',
    },
    barLabel: {
      fontSize: 10,
      color: colors.textMuted,
    },
  });
}
