import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useI18n } from '@/src/i18n/useI18n';
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
  const { isEnglish } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const copy = useMemo(
    () =>
      isEnglish
        ? {
            onboardingTitle: 'Initial Registration',
            profileTitle: 'Profile',
            onboardingSubtitle: 'Fill your local profile to start the app (offline)',
            profileSubtitle: 'Local user data (no login)',
            name: 'Name',
            age: 'Age',
            heightCm: 'Height (cm)',
            weightKg: 'Weight (kg)',
            experienceLevel: 'Experience level',
            sedentaryLevel: 'Sedentary level',
            goals: 'Goals',
            beginner: 'Beginner',
            intermediate: 'Intermediate',
            advanced: 'Advanced',
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            saveEnter: 'Save and Enter',
            saveProfile: 'Save Profile',
            reload: 'Reload',
            loading: 'Loading local data...',
            saving: 'Saving...',
            ready: 'Ready to edit.',
            savedAt: (time: string) => `Saved locally at ${time}`,
          }
        : {
            onboardingTitle: 'Cadastro Inicial',
            profileTitle: 'Perfil',
            onboardingSubtitle: 'Preencha seu cadastro local para iniciar o app (offline)',
            profileSubtitle: 'Dados locais do usuario (sem login)',
            name: 'Nome',
            age: 'Idade',
            heightCm: 'Altura (cm)',
            weightKg: 'Peso (kg)',
            experienceLevel: 'Nivel de experiencia',
            sedentaryLevel: 'Nivel de sedentarismo',
            goals: 'Objetivos',
            beginner: 'Iniciante',
            intermediate: 'Intermediario',
            advanced: 'Avancado',
            low: 'Baixo',
            medium: 'Medio',
            high: 'Alto',
            saveEnter: 'Salvar e Entrar',
            saveProfile: 'Salvar Perfil',
            reload: 'Recarregar',
            loading: 'Carregando dados locais...',
            saving: 'Salvando...',
            ready: 'Pronto para editar.',
            savedAt: (time: string) => `Salvo localmente as ${time}`,
          },
    [isEnglish],
  );
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
    setSaveMessage(copy.savedAt(new Date().toLocaleTimeString(isEnglish ? 'en-US' : 'pt-BR')));
    if (mode === 'onboarding' && nextProfile.name && onContinue) {
      onContinue();
    }
  }

  return (
    <ScreenShell
      title={mode === 'onboarding' ? copy.onboardingTitle : copy.profileTitle}
      subtitle={
        mode === 'onboarding'
          ? copy.onboardingSubtitle
          : copy.profileSubtitle
      }
    >
      <View style={styles.card}>
        <FormField
          label={copy.name}
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          placeholder="Ex.: Maria"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <FormField
              label={copy.age}
              value={form.age}
              onChangeText={(age) => setForm((prev) => ({ ...prev, age }))}
              keyboardType="numeric"
              placeholder="29"
            />
          </View>
          <View style={styles.half}>
            <FormField
              label={copy.heightCm}
              value={form.heightCm}
              onChangeText={(heightCm) => setForm((prev) => ({ ...prev, heightCm }))}
              keyboardType="numeric"
              placeholder="172"
            />
          </View>
        </View>

        <FormField
          label={copy.weightKg}
          value={form.weightKg}
          onChangeText={(weightKg) => setForm((prev) => ({ ...prev, weightKg }))}
          keyboardType="numeric"
          placeholder="78.5"
        />

        <Text style={styles.label}>{copy.experienceLevel}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={form.experienceLevel}
            style={{ color: colors.text }}
            dropdownIconColor={colors.accent}
            onValueChange={(experienceLevel) =>
              setForm((prev) => ({ ...prev, experienceLevel: experienceLevel as ExperienceLevel }))
            }
          >
            <Picker.Item label={copy.beginner} value="iniciante" />
            <Picker.Item label={copy.intermediate} value="intermediario" />
            <Picker.Item label={copy.advanced} value="avancado" />
          </Picker>
        </View>

        <Text style={styles.label}>{copy.sedentaryLevel}</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={form.sedentaryLevel}
            style={{ color: colors.text }}
            dropdownIconColor={colors.accent}
            onValueChange={(sedentaryLevel) =>
              setForm((prev) => ({ ...prev, sedentaryLevel: sedentaryLevel as SedentaryLevel }))
            }
          >
            <Picker.Item label={copy.low} value="baixo" />
            <Picker.Item label={copy.medium} value="medio" />
            <Picker.Item label={copy.high} value="alto" />
          </Picker>
        </View>

        <FormField
          label={copy.goals}
          value={form.goals}
          onChangeText={(goals) => setForm((prev) => ({ ...prev, goals }))}
          placeholder="Ex.: Ganho de forca e consistencia 4x/semana"
          multiline
        />

        <View style={styles.actionRow}>
          <PrimaryButton
            label={mode === 'onboarding' ? copy.saveEnter : copy.saveProfile}
            onPress={handleSave}
            disabled={!isReady}
          />
          {mode === 'profile' ? (
            <PrimaryButton
              label={copy.reload}
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
          {!isReady ? copy.loading : isSaving ? copy.saving : copy.ready}
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
