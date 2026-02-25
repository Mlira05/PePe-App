import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useI18n } from '@/src/i18n/useI18n';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';

export default function SettingsRoute() {
  const { data, saveSettings } = useAppStore();
  const { colors, mode } = useAppTheme();
  const { t, isEnglish } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const copy = useMemo(
    () =>
      isEnglish
        ? {
            themeHelp: 'Current default: dark background with light purple accents. Switch to light if you prefer.',
            sessionTitle: 'Session (real gym use)',
            autoRest: 'Auto-start rest',
            advancedFields: 'Advanced fields',
            timerTitle: 'Timer / Alerts',
            warning10: '10s warning',
            notifSounds: 'Notification sounds',
            haptics: 'Haptics',
            timerHelp:
              'Rest alerts use local notifications to continue in background (when allowed by the OS).',
            quickAdjustTitle: 'Quick Adjustments',
            quickAdjustHelp: 'Fast taps in the session runner for weight/reps (sweaty hands, less typing).',
            smallWeight: 'Small weight (kg)',
            largeWeight: 'Large weight (kg)',
            repStep: 'Rep step',
            privacyTitle: 'Privacy & Data (local-only)',
            privacyHelp:
              'This prototype stores data locally on the device (SQLite). Exports and backups contain workout and profile data. Do not share backup files unless you want to expose that data.',
            on: 'ON',
            off: 'OFF',
          }
        : {
            themeHelp: 'Padrao atual: fundo escuro com roxo claro. Mude para claro se preferir.',
            sessionTitle: 'Sessao (uso real na academia)',
            autoRest: 'Auto-start rest',
            advancedFields: 'Campos avancados',
            timerTitle: 'Timer / Alertas',
            warning10: 'Aviso 10s',
            notifSounds: 'Sons notif.',
            haptics: 'Haptics',
            timerHelp:
              'Alertas de descanso usam notificacoes locais para continuar mesmo em background (quando permitido pelo SO).',
            quickAdjustTitle: 'Ajustes rapidos',
            quickAdjustHelp: 'Toques rapidos no runner para peso/reps (mao suada, pouca digitacao).',
            smallWeight: 'Peso pequeno (kg)',
            largeWeight: 'Peso grande (kg)',
            repStep: 'Rep step',
            privacyTitle: 'Privacidade & Dados (local-only)',
            privacyHelp:
              'Este prototipo salva dados localmente no aparelho (SQLite). Exportacoes e backups conterao seus dados de treino e perfil. Nao compartilhe arquivos de backup se nao quiser expor esses dados.',
            on: 'ON',
            off: 'OFF',
          },
    [isEnglish],
  );

  const settings = data.settings;

  return (
    <ScreenShell title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <Text style={styles.helper}>{t('settings.languageHelp')}</Text>
        <View style={styles.row}>
          <PrimaryButton
            label={t('settings.portuguese')}
            onPress={() => void saveSettings({ ...settings, language: 'pt-BR' })}
            variant={!isEnglish ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label={t('settings.english')}
            onPress={() => void saveSettings({ ...settings, language: 'en' })}
            variant={isEnglish ? 'primary' : 'secondary'}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
        <Text style={styles.helper}>{copy.themeHelp}</Text>
        <View style={styles.row}>
          <PrimaryButton
            label={t('settings.darkDefault')}
            onPress={() => void saveSettings({ ...settings, colorMode: 'dark' })}
            variant={mode === 'dark' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label={t('settings.light')}
            onPress={() => void saveSettings({ ...settings, colorMode: 'light' })}
            variant={mode === 'light' ? 'primary' : 'secondary'}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.sessionTitle}</Text>
        <View style={styles.row}>
          <PrimaryButton
            label={`${copy.autoRest}: ${settings.timer.autoStartRestAfterSet ? copy.on : copy.off}`}
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
            label={`${copy.advancedFields}: ${settings.session.showAdvancedSetFields ? copy.on : copy.off}`}
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
        <Text style={styles.sectionTitle}>{copy.timerTitle}</Text>
        <View style={styles.row}>
          <PrimaryButton
            label={`${copy.warning10}: ${settings.timer.warn10Seconds ? copy.on : copy.off}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                timer: { ...settings.timer, warn10Seconds: !settings.timer.warn10Seconds },
              })
            }
            variant="secondary"
          />
          <PrimaryButton
            label={`${copy.notifSounds}: ${settings.timer.soundsEnabled ? copy.on : copy.off}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                timer: { ...settings.timer, soundsEnabled: !settings.timer.soundsEnabled },
              })
            }
            variant="secondary"
          />
          <PrimaryButton
            label={`${copy.haptics}: ${settings.timer.hapticsEnabled ? copy.on : copy.off}`}
            onPress={() =>
              void saveSettings({
                ...settings,
                timer: { ...settings.timer, hapticsEnabled: !settings.timer.hapticsEnabled },
              })
            }
            variant="secondary"
          />
        </View>
        <Text style={styles.helper}>{copy.timerHelp}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.quickAdjustTitle}</Text>
        <Text style={styles.helper}>{copy.quickAdjustHelp}</Text>
        <View style={styles.row}>
          <View style={styles.inputCol}>
            <FormField
              label={copy.smallWeight}
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
              label={copy.largeWeight}
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
              label={copy.repStep}
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
        <Text style={styles.sectionTitle}>{copy.privacyTitle}</Text>
        <Text style={styles.helper}>{copy.privacyHelp}</Text>
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
