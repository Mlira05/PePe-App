import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useI18n } from '@/src/i18n/useI18n';
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

function getCopy(isEnglish: boolean) {
  return isEnglish
    ? {
        title: 'Analytics',
        subtitle: 'History, filters, and progression',
        filters: 'Filters',
        range7: '7d',
        range30: '30d',
        rangeAll: 'All',
        overview: 'Overview',
        sessions: 'Sessions',
        prs: 'PRs',
        summary: 'Summary',
        filteredSessions: 'Filtered sessions',
        lastSession: 'Last session',
        none: 'none',
        progression: 'Progression (volume)',
        noDataPeriod: 'No data in selected period.',
        weeklyConsistency: 'Days trained per week',
        noSessions: 'No sessions yet.',
        volumeByExercise: 'Total volume by exercise',
        noVolume: 'No volume data yet.',
        simplePrs: 'PRs',
        noPrs: 'No PRs yet.',
        maxWeight: 'Max weight',
        bestRepsAtWeight: 'Best reps @ weight',
        sessionHistory: 'Session history',
        noSessionsInFilter: 'No sessions in current filter.',
        open: 'open',
        sets: 'sets',
        records: 'records',
        day: 'day(s)',
      }
    : {
        title: 'Analytics',
        subtitle: 'Historico, filtros e progressao',
        filters: 'Filtros',
        range7: '7 dias',
        range30: '30 dias',
        rangeAll: 'Tudo',
        overview: 'Overview',
        sessions: 'Sessoes',
        prs: 'PRs',
        summary: 'Resumo',
        filteredSessions: 'Sessoes filtradas',
        lastSession: 'Ultima sessao',
        none: 'nenhuma',
        progression: 'Progressao (volume)',
        noDataPeriod: 'Sem dados no periodo selecionado.',
        weeklyConsistency: 'Dias treinados por semana',
        noSessions: 'Sem sessoes ainda.',
        volumeByExercise: 'Volume total por exercicio',
        noVolume: 'Sem volume calculavel ainda.',
        simplePrs: 'PRs',
        noPrs: 'Sem PRs detectados ainda.',
        maxWeight: 'Max weight',
        bestRepsAtWeight: 'Best reps @ weight',
        sessionHistory: 'Historico de sessoes',
        noSessionsInFilter: 'Nenhuma sessao no filtro atual.',
        open: 'em aberto',
        sets: 'series',
        records: 'registros',
        day: 'dia(s)',
      };
}

export default function AnalyticsScreen() {
  const { data } = useAppStore();
  const { colors } = useAppTheme();
  const { isEnglish } = useI18n();
  const copy = useMemo(() => getCopy(isEnglish), [isEnglish]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [range, setRange] = useState<RangeFilter>('30d');
  const [view, setView] = useState<ViewFilter>('overview');

  const filteredSessions = useMemo(() => applyRangeFilter(data.sessions, range), [data.sessions, range]);
  const weeklyStats = getWeeklyTrainingStats(filteredSessions).slice(0, 8);
  const volumeStats = getExerciseVolumeStats(filteredSessions).slice(0, 8);
  const prStats = getExercisePrStats(filteredSessions).slice(0, 8);
  const sessionSeries = getSessionVolumeSeries(filteredSessions).slice(-12);

  return (
    <ScreenShell title={copy.title} subtitle={copy.subtitle}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.filters}</Text>
        <View style={styles.row}>
          <PrimaryButton label={copy.range7} onPress={() => setRange('7d')} variant={range === '7d' ? 'primary' : 'secondary'} size="compact" />
          <PrimaryButton label={copy.range30} onPress={() => setRange('30d')} variant={range === '30d' ? 'primary' : 'secondary'} size="compact" />
          <PrimaryButton label={copy.rangeAll} onPress={() => setRange('all')} variant={range === 'all' ? 'primary' : 'secondary'} size="compact" />
        </View>
        <View style={styles.row}>
          <PrimaryButton label={copy.overview} onPress={() => setView('overview')} variant={view === 'overview' ? 'primary' : 'secondary'} size="compact" />
          <PrimaryButton label={copy.sessions} onPress={() => setView('sessions')} variant={view === 'sessions' ? 'primary' : 'secondary'} size="compact" />
          <PrimaryButton label={copy.prs} onPress={() => setView('prs')} variant={view === 'prs' ? 'primary' : 'secondary'} size="compact" />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.summary}</Text>
        <Text style={styles.helper}>{copy.filteredSessions}: {filteredSessions.length}</Text>
        <Text style={styles.helper}>
          {copy.lastSession}: {filteredSessions[0] ? formatDateTime(filteredSessions[0].startedAt, isEnglish) : copy.none}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.progression}</Text>
        {sessionSeries.length === 0 ? (
          <Text style={styles.helper}>{copy.noDataPeriod}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TrendChart series={sessionSeries} colors={colors} isEnglish={isEnglish} />
          </ScrollView>
        )}
      </View>

      {(view === 'overview' || view === 'sessions') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{copy.weeklyConsistency}</Text>
          {weeklyStats.length === 0 ? (
            <Text style={styles.helper}>{copy.noSessions}</Text>
          ) : (
            weeklyStats.map((item) => (
              <View key={item.weekKey} style={styles.rowBetween}>
                <Text style={styles.rowLabel}>{item.weekKey}</Text>
                <Text style={styles.rowValue}>{item.daysTrained} {copy.day}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {(view === 'overview' || view === 'sessions') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{copy.volumeByExercise}</Text>
          {volumeStats.length === 0 ? (
            <Text style={styles.helper}>{copy.noVolume}</Text>
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
          <Text style={styles.sectionTitle}>{copy.simplePrs}</Text>
          {prStats.length === 0 ? (
            <Text style={styles.helper}>{copy.noPrs}</Text>
          ) : (
            prStats.map((item) => (
              <View key={item.exerciseName} style={styles.prCard}>
                <Text style={styles.rowLabel}>{item.exerciseName}</Text>
                <Text style={styles.helper}>{copy.maxWeight}: {item.maxWeightKg ?? '-'} kg</Text>
                <Text style={styles.helper}>
                  {copy.bestRepsAtWeight}:{' '}
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
          <Text style={styles.sectionTitle}>{copy.sessionHistory}</Text>
          {filteredSessions.length === 0 ? (
            <Text style={styles.helper}>{copy.noSessionsInFilter}</Text>
          ) : (
            filteredSessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <Text style={styles.sessionTitle}>{session.workoutPlanLabel}</Text>
                <Text style={styles.helper}>
                  {formatDateTime(session.startedAt, isEnglish)} • {session.setLogs.length} {copy.sets}
                </Text>
                <Text style={styles.helper}>
                  {session.endedAt ? formatDateTime(session.endedAt, isEnglish) : copy.open}
                </Text>
                <Text style={styles.miniMuted}>
                  {session.setLogs.length > 0 ? `${Math.min(8, session.setLogs.length)} / ${session.setLogs.length} ${copy.records}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScreenShell>
  );
}

function TrendChart({
  series,
  colors,
  isEnglish,
}: {
  series: ReturnType<typeof getSessionVolumeSeries>;
  colors: ReturnType<typeof useAppTheme>['colors'];
  isEnglish: boolean;
}) {
  const width = Math.max(320, series.length * 40);
  const height = 190;
  const chartTop = 12;
  const chartBottom = 32;
  const chartHeight = height - chartTop - chartBottom;
  const max = Math.max(...series.map((p) => p.volume), 1);
  const colWidth = width / Math.max(series.length, 1);

  const points = series.map((point, index) => {
    const x = Math.round(index * colWidth + colWidth / 2);
    const normalized = point.volume / max;
    const y = Math.round(chartTop + (1 - normalized) * chartHeight);
    const barHeight = Math.max(8, Math.round(normalized * chartHeight));
    return { ...point, x, y, barHeight };
  });

  return (
    <View style={{ width, height }}>
      <View style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={`h-${i}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: chartTop + (chartHeight / 4) * i,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              opacity: 0.8,
            }}
          />
        ))}
        {points.map((p) => (
          <View
            key={`v-${p.sessionId}`}
            style={{
              position: 'absolute',
              top: chartTop,
              bottom: chartBottom,
              left: p.x,
              borderLeftWidth: 1,
              borderLeftColor: colors.border,
              opacity: 0.35,
            }}
          />
        ))}
      </View>

      {points.map((p) => (
        <View
          key={`bar-${p.sessionId}`}
          style={{
            position: 'absolute',
            left: p.x - 8,
            bottom: chartBottom,
            width: 16,
            height: p.barHeight,
            borderRadius: 6,
            backgroundColor: `${colors.accent}55`,
            borderWidth: 1,
            borderColor: `${colors.accent}88`,
          }}
        />
      ))}

      {points.slice(1).map((point, idx) => {
        const prev = points[idx];
        const dx = point.x - prev.x;
        const dy = point.y - prev.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const midX = (prev.x + point.x) / 2;
        const midY = (prev.y + point.y) / 2;
        return (
          <View
            key={`line-${point.sessionId}`}
            style={{
              position: 'absolute',
              left: midX - length / 2,
              top: midY - 1,
              width: length,
              height: 2,
              backgroundColor: colors.accent,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {points.map((p) => (
        <View
          key={`dot-${p.sessionId}`}
          style={{
            position: 'absolute',
            left: p.x - 4,
            top: p.y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.accent,
            borderWidth: 1,
            borderColor: colors.background,
          }}
        />
      ))}

      {points.map((p) => (
        <Text
          key={`label-${p.sessionId}`}
          style={{
            position: 'absolute',
            bottom: 0,
            left: p.x - 18,
            width: 36,
            textAlign: 'center',
            fontSize: 10,
            color: colors.textMuted,
          }}
        >
          {p.label}
        </Text>
      ))}

      <Text
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: 11,
          color: colors.textMuted,
        }}
      >
        {isEnglish ? `Max ${Math.round(max)} kg` : `Max ${Math.round(max)} kg`}
      </Text>
    </View>
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

function formatDateTime(value: string, isEnglish: boolean): string {
  return new Date(value).toLocaleString(isEnglish ? 'en-US' : 'pt-BR');
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
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    helper: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 18,
    },
    miniMuted: {
      fontSize: 11,
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
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
      fontSize: 12,
      color: colors.textMuted,
    },
    prCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 3,
      backgroundColor: colors.surfaceAlt,
    },
    sessionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      padding: 10,
      gap: 2,
    },
    sessionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
  });
}
