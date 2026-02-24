import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import {
  getExercisePrStats,
  getExerciseVolumeStats,
  getWeeklyTrainingStats,
} from '@/src/lib/analytics';
import { useAppStore } from '@/src/state/AppStore';

export default function HistoryScreen() {
  const { data } = useAppStore();
  const weeklyStats = getWeeklyTrainingStats(data.sessions).slice(0, 8);
  const volumeStats = getExerciseVolumeStats(data.sessions).slice(0, 10);
  const prStats = getExercisePrStats(data.sessions).slice(0, 12);

  return (
    <ScreenShell title="Histórico" subtitle="Sessões, PRs e estatísticas básicas">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        <Text style={styles.helper}>Sessões salvas: {data.sessions.length}</Text>
        <Text style={styles.helper}>
          Última sessão: {data.sessions[0] ? formatDateTime(data.sessions[0].startedAt) : 'nenhuma'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dias treinados por semana</Text>
        {weeklyStats.length === 0 ? (
          <Text style={styles.helper}>Sem sessões ainda.</Text>
        ) : (
          weeklyStats.map((item) => (
            <View key={item.weekKey} style={styles.rowBetween}>
              <Text style={styles.rowLabel}>{item.weekKey}</Text>
              <Text style={styles.rowValue}>{item.daysTrained} dia(s)</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Volume total por exercício</Text>
        {volumeStats.length === 0 ? (
          <Text style={styles.helper}>Sem volume calculável ainda.</Text>
        ) : (
          volumeStats.map((item) => (
            <View key={item.exerciseName} style={styles.rowBetween}>
              <Text style={styles.rowLabel}>{item.exerciseName}</Text>
              <Text style={styles.rowValue}>{Math.round(item.totalVolume)} kg</Text>
            </View>
          ))
        )}
      </View>

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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sessões</Text>
        {data.sessions.length === 0 ? (
          <Text style={styles.helper}>Nenhuma sessão registrada ainda.</Text>
        ) : (
          data.sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <Text style={styles.sessionTitle}>{session.workoutPlanLabel}</Text>
              <Text style={styles.helper}>
                {formatDateTime(session.startedAt)} • {session.setLogs.length} série(s)
              </Text>
              <Text style={styles.helper}>Fim: {session.endedAt ? formatDateTime(session.endedAt) : 'em aberto'}</Text>

              <View style={styles.logList}>
                {session.setLogs.map((log) => (
                  <Text key={`${session.id}-${log.setId}`} style={styles.logLine}>
                    • {log.exerciseName} S{log.setOrder}: {log.actualReps ?? '-'} reps / {log.actualWeightKg ?? '-'} kg
                    (alvo {log.targetReps}
                    {log.targetWeightKg != null ? ` / ${log.targetWeightKg}kg` : ''})
                  </Text>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </ScreenShell>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  helper: {
    fontSize: 13,
    color: '#4b5563',
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
    color: '#1f2937',
  },
  rowValue: {
    fontSize: 13,
    color: '#111827',
  },
  prCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    gap: 2,
    backgroundColor: '#f9fafb',
  },
  sessionCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    padding: 10,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  logList: {
    marginTop: 4,
    gap: 2,
  },
  logLine: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
});
