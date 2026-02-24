import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';

export default function SettingsRoute() {
  const { data, saveSettings } = useAppStore();
  const { colors, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const settings = data.settings;

  return (
    <ScreenShell title="Configs" subtitle="Preferencias locais, timers e privacidade">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tema</Text>
        <Text style={styles.helper}>Padrao atual: fundo escuro com roxo claro. Mude para claro se preferir.</Text>
        <View style={styles.row}>
          <PrimaryButton
            label="Escuro (padrao)"
            onPress={() => void saveSettings({ ...settings, colorMode: 'dark' })}
            variant={mode === 'dark' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label="Claro"
            onPress={() => void saveSettings({ ...settings, colorMode: 'light' })}
            variant={mode === 'light' ? 'primary' : 'secondary'}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sessao (uso real na academia)</Text>
        <View style={styles.row}>
          <PrimaryButton
            label={`Auto-start rest: ${settings.timer.autoStartRestAfterSet ? 'ON' : 'OFF'}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                timer: {
                  ...settings.timer,
                  autoStartRestAfterSet: !settings.timer.autoStartRestAfterSet,
                },
              })
            }
            variant="secondary"
          />
          <PrimaryButton
            label={`Campos avancados: ${settings.session.showAdvancedSetFields ? 'ON' : 'OFF'}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                session: {
                  ...settings.session,
                  showAdvancedSetFields: !settings.session.showAdvancedSetFields,
                },
              })
            }
            variant="secondary"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Timer / Alertas</Text>
        <View style={styles.row}>
          <PrimaryButton
            label={`Aviso 10s: ${settings.timer.warn10Seconds ? 'ON' : 'OFF'}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                timer: { ...settings.timer, warn10Seconds: !settings.timer.warn10Seconds },
              })
            }
            variant="secondary"
          />
          <PrimaryButton
            label={`Sons notif.: ${settings.timer.soundsEnabled ? 'ON' : 'OFF'}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                timer: { ...settings.timer, soundsEnabled: !settings.timer.soundsEnabled },
              })
            }
            variant="secondary"
          />
          <PrimaryButton
            label={`Haptics: ${settings.timer.hapticsEnabled ? 'ON' : 'OFF'}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                timer: { ...settings.timer, hapticsEnabled: !settings.timer.hapticsEnabled },
              })
            }
            variant="secondary"
          />
        </View>
        <Text style={styles.helper}>
          Alertas de descanso usam notificacoes locais para continuar mesmo em background (quando permitido pelo SO).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ajustes rapidos</Text>
        <Text style={styles.helper}>Toques rapidos no runner para peso/reps (mao suada, pouca digitacao).</Text>
        <View style={styles.row}>
          <View style={styles.inputCol}>
            <FormField
              label="Peso pequeno (kg)"
              value={String(settings.quickAdjust.weightStepSmallKg)}
              onChangeText={(value) =>
                void saveSettings({
                  ...settings,
                  quickAdjust: {
                    ...settings.quickAdjust,
                    weightStepSmallKg: parsePositive(value, settings.quickAdjust.weightStepSmallKg),
                  },
                })
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputCol}>
            <FormField
              label="Peso grande (kg)"
              value={String(settings.quickAdjust.weightStepLargeKg)}
              onChangeText={(value) =>
                void saveSettings({
                  ...settings,
                  quickAdjust: {
                    ...settings.quickAdjust,
                    weightStepLargeKg: parsePositive(value, settings.quickAdjust.weightStepLargeKg),
                  },
                })
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputCol}>
            <FormField
              label="Rep step"
              value={String(settings.quickAdjust.repStep)}
              onChangeText={(value) =>
                void saveSettings({
                  ...settings,
                  quickAdjust: {
                    ...settings.quickAdjust,
                    repStep: Math.max(1, Math.round(parsePositive(value, settings.quickAdjust.repStep))),
                  },
                })
              }
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Privacidade & Dados (local-only)</Text>
        <Text style={styles.helper}>
          Este prototipo salva dados localmente no aparelho (SQLite). Exportacoes e backups conterao seus dados de treino e perfil.
          Nao compartilhe arquivos de backup se nao quiser expor esses dados.
        </Text>
      </View>
    </ScreenShell>
  );
}

function parsePositive(value: string, fallback: number): number {
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    helper: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    inputCol: {
      minWidth: 120,
      flex: 1,
    },
  });
}
