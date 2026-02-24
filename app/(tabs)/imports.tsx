import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { makeId } from '@/src/lib/id';
import { parseWorkoutCsv, parseWorkoutXlsxBase64 } from '@/src/lib/imports';
import { useAppStore } from '@/src/state/AppStore';
import type { ImportRecord } from '@/src/types/models';

export default function ImportsScreen() {
  const { data, addImportRecord, importWorkoutPlans, seedDemoData } = useAppStore();
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [status, setStatus] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleCsvImport() {
    setWarnings([]);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    const text = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = parseWorkoutCsv(text);
    const record: ImportRecord = {
      id: makeId('import'),
      source: 'csv',
      filename: asset.name,
      uri: asset.uri,
      status: parsed.plans.length > 0 ? 'completed' : 'error',
      summary: `CSV: ${parsed.plans.length} plano(s) importado(s)`,
      createdAt: new Date().toISOString(),
      metadataJson: { warnings: parsed.warnings.length, rows: text.split('\n').length },
    };
    if (parsed.plans.length > 0) {
      await importWorkoutPlans(parsed.plans, record);
      setStatus(record.summary);
    } else {
      await addImportRecord({ ...record, summary: 'CSV sem dados válidos para importar.' });
      setStatus('CSV sem dados válidos para importar.');
    }
    setWarnings(parsed.warnings);
  }

  async function handleXlsxImport() {
    setWarnings([]);
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        '*/*',
      ],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const parsed = parseWorkoutXlsxBase64(base64);
    const record: ImportRecord = {
      id: makeId('import'),
      source: 'xlsx',
      filename: asset.name,
      uri: asset.uri,
      status: parsed.plans.length > 0 ? 'completed' : 'error',
      summary: `XLSX: ${parsed.plans.length} plano(s) importado(s)`,
      createdAt: new Date().toISOString(),
      metadataJson: { warnings: parsed.warnings.length },
    };
    if (parsed.plans.length > 0) {
      await importWorkoutPlans(parsed.plans, record);
      setStatus(record.summary);
    } else {
      await addImportRecord({ ...record, summary: 'XLSX sem dados válidos para importar.' });
      setStatus('XLSX sem dados válidos para importar.');
    }
    setWarnings(parsed.warnings);
  }

  async function handlePdfStub() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    await addImportRecord({
      id: makeId('import'),
      source: 'pdf',
      filename: asset.name,
      uri: asset.uri,
      status: 'stub_todo',
      summary: 'PDF selecionado e metadados salvos (TODO: parser robusto).',
      createdAt: new Date().toISOString(),
      metadataJson: {
        mimeType: asset.mimeType ?? 'unknown',
        size: asset.size ?? 0,
      },
    });
    setStatus('PDF salvo como stub (metadados + TODO).');
    setWarnings([]);
  }

  async function handleGoogleSheetsStub() {
    const trimmed = googleSheetsUrl.trim();
    if (!trimmed) {
      setStatus('Informe um link do Google Sheets.');
      return;
    }
    await addImportRecord({
      id: makeId('import'),
      source: 'googleSheets',
      googleSheetsUrl: trimmed,
      status: 'stub_todo',
      summary: 'Link Google Sheets salvo (TODO: importação local).',
      createdAt: new Date().toISOString(),
    });
    setStatus('Link salvo como stub (TODO).');
    setWarnings([]);
    setGoogleSheetsUrl('');
  }

  async function handleSeedDemoData() {
    await seedDemoData();
    setWarnings([]);
    setStatus('Dados demo inseridos (perfil, planos e sessoes). Pode duplicar se clicar novamente.');
  }

  return (
    <ScreenShell title="Importar" subtitle="Arquivos locais e stubs">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Teste rapido</Text>
        <Text style={styles.helper}>
          Popular o app com dados demo locais para validar telas (perfil, treinos, sessoes e analytics).
        </Text>
        <PrimaryButton label="Seed Demo Data" onPress={() => void handleSeedDemoData()} variant="secondary" />
        <Text style={styles.helper}>
          Arquivos de exemplo no repo: <Text style={styles.code}>samples/workout-import-sample.csv</Text> e{' '}
          <Text style={styles.code}>samples/workout-import-sample.xlsx</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Importação local</Text>
        <View style={styles.row}>
          <PrimaryButton label="Importar CSV" onPress={() => void handleCsvImport()} />
          <PrimaryButton label="Importar XLSX" onPress={() => void handleXlsxImport()} variant="secondary" />
          <PrimaryButton label="PDF (stub)" onPress={() => void handlePdfStub()} variant="secondary" />
        </View>

        <Text style={styles.sectionTitle}>Google Sheets (stub)</Text>
        <FormField
          label="Link da planilha"
          value={googleSheetsUrl}
          onChangeText={setGoogleSheetsUrl}
          placeholder="https://docs.google.com/spreadsheets/..."
        />
        <PrimaryButton label="Salvar link (TODO)" onPress={() => void handleGoogleSheetsStub()} variant="secondary" />

        <Text style={styles.sectionTitle}>Formato esperado (CSV/XLSX)</Text>
        <Text style={styles.helper}>
          Colunas mínimas: <Text style={styles.code}>dayLabel</Text>, <Text style={styles.code}>exercise</Text>,{' '}
          <Text style={styles.code}>targetReps</Text>. Opcionais: <Text style={styles.code}>targetWeightKg</Text>,{' '}
          <Text style={styles.code}>restSeconds</Text>, <Text style={styles.code}>notes</Text>,{' '}
          <Text style={styles.code}>supersetGroupId</Text>, <Text style={styles.code}>tagsJson</Text>.
        </Text>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {warnings.length > 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Avisos ({warnings.length})</Text>
            {warnings.slice(0, 12).map((warning, index) => (
              <Text key={`${warning}-${index}`} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Histórico de importações</Text>
        {data.imports.length === 0 ? (
          <Text style={styles.helper}>Nenhuma importação registrada.</Text>
        ) : (
          data.imports.map((item) => (
            <View key={item.id} style={styles.importRow}>
              <View style={styles.importRowText}>
                <Text style={styles.importTitle}>
                  {item.source.toUpperCase()} • {item.status}
                </Text>
                <Text style={styles.helper}>{item.filename ?? item.googleSheetsUrl ?? item.uri ?? 'sem referência'}</Text>
                <Text style={styles.helper}>{item.summary}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScreenShell>
  );
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
    flexWrap: 'wrap',
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
    lineHeight: 19,
  },
  code: {
    fontFamily: 'monospace',
    color: '#111827',
  },
  status: {
    fontSize: 13,
    color: '#0f766e',
    fontWeight: '600',
  },
  warningBox: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  warningText: {
    fontSize: 12,
    color: '#78350f',
  },
  importRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  importRowText: {
    gap: 2,
  },
  importTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
});
