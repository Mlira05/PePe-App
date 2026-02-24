import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { ScreenShell } from '@/src/components/ScreenShell';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { FormField } from '@/src/components/ui/FormField';
import { useAppStore } from '@/src/state/AppStore';
import type { ExperienceLevel, Profile, SedentaryLevel } from '@/src/types/models';

export default function ProfileScreen() {
  const { data, isReady, isSaving, saveProfile } = useAppStore();
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
    setSaveMessage(`Salvo localmente às ${new Date().toLocaleTimeString('pt-BR')}`);
  }

  return (
    <ScreenShell title="Perfil" subtitle="Dados locais do usuário (sem login, offline-first)">
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

        <Text style={styles.label}>Nível de experiência</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={form.experienceLevel}
            onValueChange={(experienceLevel) =>
              setForm((prev) => ({ ...prev, experienceLevel: experienceLevel as ExperienceLevel }))
            }
          >
            <Picker.Item label="Iniciante" value="iniciante" />
            <Picker.Item label="Intermediário" value="intermediario" />
            <Picker.Item label="Avançado" value="avancado" />
          </Picker>
        </View>

        <Text style={styles.label}>Nível de sedentarismo</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={form.sedentaryLevel}
            onValueChange={(sedentaryLevel) =>
              setForm((prev) => ({ ...prev, sedentaryLevel: sedentaryLevel as SedentaryLevel }))
            }
          >
            <Picker.Item label="Baixo" value="baixo" />
            <Picker.Item label="Médio" value="medio" />
            <Picker.Item label="Alto" value="alto" />
          </Picker>
        </View>

        <FormField
          label="Objetivos"
          value={form.goals}
          onChangeText={(goals) => setForm((prev) => ({ ...prev, goals }))}
          placeholder="Ex.: Ganho de força e consistência 4x/semana"
          multiline
        />

        <View style={styles.actionRow}>
          <PrimaryButton label="Salvar Perfil" onPress={handleSave} disabled={!isReady} />
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
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
    color: '#374151',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  helper: {
    fontSize: 13,
    color: '#4b5563',
  },
  saved: {
    fontSize: 13,
    color: '#0f766e',
    fontWeight: '600',
  },
});
