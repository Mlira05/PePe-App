import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenShell } from '@/src/components/ScreenShell';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';

export default function SettingsRoute() {
  const { data, saveSettings } = useAppStore();
  const { colors, mode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScreenShell title="Configs" subtitle="Preferencias locais do app">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tema</Text>
        <Text style={styles.helper}>Padrao atual: fundo escuro com roxo claro. Mude para claro se preferir.</Text>
        <View style={styles.row}>
          <PrimaryButton
            label="Escuro (padrao)"
            onPress={() => void saveSettings({ ...data.settings, colorMode: 'dark' })}
            variant={mode === 'dark' ? 'primary' : 'secondary'}
          />
          <PrimaryButton
            label="Claro"
            onPress={() => void saveSettings({ ...data.settings, colorMode: 'light' })}
            variant={mode === 'light' ? 'primary' : 'secondary'}
          />
        </View>
      </View>
    </ScreenShell>
  );
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
  });
}
