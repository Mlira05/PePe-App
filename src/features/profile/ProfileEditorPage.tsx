import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { ExperienceLevel, Profile, SedentaryLevel } from '@/src/types/models';

interface Props {
  mode: 'onboarding' | 'profile';
  onContinue?: () => void;
}

export function ProfileEditorPage({ mode, onContinue }: Props) {
  const { data, isReady, isSaving, saveProfile } = useAppStore();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [form, setForm] = useState({
    name: '',
    age: '',
    heightCm: '',
    weightKg: '',
    experienceLevel: 'iniciante' as ExperienceLevel,
    sedentaryLevel: 'medio' as SedentaryLevel,
    goals: '',
  });
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    setForm({
      name: data.profile.name ?? '',
      age: formatOptionalNumber(data.profile.age),
      heightCm: formatOptionalNumber(data.profile.heightCm),
      weightKg: formatOptionalNumber(data.profile.weightKg),
      experienceLevel: data.profile.experienceLevel,
      sedentaryLevel: data.profile.sedentaryLevel,
      goals: data.profile.goals ?? '',
    });
  }, [data.profile]);

  async function handleSave() {
    const nextProfile: Profile = {
      name: form.name.trim(),
      age: parseOptionalNumber(form.age),
      heightCm: parseOptionalNumber(form.heightCm),
      weightKg: parseOptionalNumber(form.weightKg),
      experienceLevel: form.experienceLevel,
      sedentaryLevel: form.sedentaryLevel,
      goals: form.goals.trim(),
    };
    await saveProfile(nextProfile);
    setSaveMessage(`Salvo localmente as ${new Date().toLocaleTimeString('pt-BR')}`);
    if (mode === 'onboarding' && nextProfile.name && onContinue) {
      onContinue();
    }
  }

  return (
    <ScreenShell
      title={mode === 'onboarding' ? 'Cadastro Inicial' : 'Perfil'}
      subtitle={
        mode === 'onboarding'
          ? 'Preencha seu cadastro local para iniciar o app (offline)'
          : 'Dados locais do usuario (sem login)'
      }
    >
      <View style={styles.card}>
        <FormField
          label="Nome"
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          placeholder="Ex.: Maria"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <FormField
              label="Idade"
              value={form.age}
              onChangeText={(age) => setForm((prev) => ({ ...prev, age }))}
              keyboardType="numeric"
              placeholder="29"
            />
          </View>
          <View style={styles.half}>
            <FormField
              label="Altura (cm)"
              value={form.heightCm}
              onChangeText={(heightCm) => setForm((prev) => ({ ...prev, heightCm }))}
              keyboardType="numeric"
              placeholder="172"
            />
          </View>
        </View>

        <FormField
          label="Peso (kg)"
          value={form.weightKg}
          onChangeText={(weightKg) => setForm((prev) => ({ ...prev, weightKg }))}
          keyboardType="numeric"
          placeholder="78.5"
        />

        <Text style={styles.label}>Nivel de experiencia</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={form.experienceLevel}
            style={{ color: colors.text }}
            dropdownIconColor={colors.accent}
            onValueChange={(experienceLevel) =>
              setForm((prev) => ({ ...prev, experienceLevel: experienceLevel as ExperienceLevel }))
            }
          >
            <Picker.Item label="Iniciante" value="iniciante" />
            <Picker.Item label="Intermediario" value="intermediario" />
            <Picker.Item label="Avancado" value="avancado" />
          </Picker>
        </View>

        <Text style={styles.label}>Nivel de sedentarismo</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={form.sedentaryLevel}
            style={{ color: colors.text }}
            dropdownIconColor={colors.accent}
            onValueChange={(sedentaryLevel) =>
              setForm((prev) => ({ ...prev, sedentaryLevel: sedentaryLevel as SedentaryLevel }))
            }
          >
            <Picker.Item label="Baixo" value="baixo" />
            <Picker.Item label="Medio" value="medio" />
            <Picker.Item label="Alto" value="alto" />
          </Picker>
        </View>

        <FormField
          label="Objetivos"
          value={form.goals}
          onChangeText={(goals) => setForm((prev) => ({ ...prev, goals }))}
          placeholder="Ex.: Ganho de forca e consistencia 4x/semana"
          multiline
        />

        <View style={styles.actionRow}>
          <PrimaryButton
            label={mode === 'onboarding' ? 'Salvar e Entrar' : 'Salvar Perfil'}
            onPress={handleSave}
            disabled={!isReady}
          />
          {mode === 'profile' ? (
            <PrimaryButton
              label="Recarregar"
              variant="secondary"
              onPress={() =>
                setForm({
                  name: data.profile.name ?? '',
                  age: formatOptionalNumber(data.profile.age),
                  heightCm: formatOptionalNumber(data.profile.heightCm),
                  weightKg: formatOptionalNumber(data.profile.weightKg),
                  experienceLevel: data.profile.experienceLevel,
                  sedentaryLevel: data.profile.sedentaryLevel,
                  goals: data.profile.goals ?? '',
                })
              }
              disabled={!isReady}
            />
          ) : null}
        </View>

        <Text style={styles.helper}>
          {!isReady ? 'Carregando dados locais...' : isSaving ? 'Salvando...' : 'Pronto para editar.'}
        </Text>
        {saveMessage ? <Text style={styles.saved}>{saveMessage}</Text> : null}
      </View>
    </ScreenShell>
  );
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatOptionalNumber(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : '';
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
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    half: {
      flex: 1,
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
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    helper: {
      fontSize: 13,
      color: colors.textMuted,
    },
    saved: {
      fontSize: 13,
      color: colors.accent,
      fontWeight: '600',
    },
  });
}
