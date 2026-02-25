import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { ScreenShell } from '@/src/components/ScreenShell';
import { FormField } from '@/src/components/ui/FormField';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useI18n } from '@/src/i18n/useI18n';
import { makeId } from '@/src/lib/id';
import { parseWorkoutCsv, parseWorkoutXlsxBase64 } from '@/src/lib/imports';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { ImportRecord } from '@/src/types/models';

function getCopy(isEnglish: boolean) {
  return isEnglish
    ? {
        title: 'Import',
        subtitle: 'Local files and stubs',
        quickSeedTitle: 'Quick seed',
        quickSeedHelp: 'Populate local demo data to test profile, workouts, sessions, and analytics.',
        seedButton: 'Seed Demo Data',
        sampleFiles: 'Sample files in repo:',
        localImportTitle: 'Local import',
        importCsv: 'Import CSV',
        importXlsx: 'Import XLSX',
        importPdfStub: 'PDF (stub)',
        gsTitle: 'Google Sheets (stub)',
        sheetLink: 'Sheet link',
        saveLink: 'Save link (TODO)',
        expectedFormat: 'Expected format (CSV/XLSX)',
        expectedText:
          'Minimum columns: dayLabel, exercise, targetReps. Optional: targetWeightKg, restSeconds, notes, supersetGroupId, tagsJson.',
        warnings: 'Warnings',
        historyTitle: 'Import history',
        selectImport: 'Select import record',
        noHistory: 'No import records yet.',
        cleanHistory: 'Clean history',
        cleanHistoryTitle: 'Clean import history',
        cleanHistoryMessage: 'Remove all import history records? This does not delete workouts already imported.',
        cancel: 'Cancel',
        clean: 'Clean',
        historyCleaned: 'Import history cleaned.',
        enterGsLink: 'Enter a Google Sheets link.',
        gsSavedStub: 'Google Sheets link saved as stub (TODO).',
        pdfSavedStub: 'PDF saved as stub (metadata + TODO).',
        csvNoValid: 'CSV has no valid data to import.',
        xlsxNoValid: 'XLSX has no valid data to import.',
        csvSummary: (count: number) => `CSV: ${count} plan(s) imported`,
        xlsxSummary: (count: number) => `XLSX: ${count} plan(s) imported`,
        gsSummary: 'Google Sheets link saved (TODO: local import).',
        pdfSummary: 'PDF selected and metadata saved (TODO: robust parser).',
        seedDone: 'Demo data inserted (can duplicate if tapped again).',
        refFallback: 'no reference',
      }
    : {
        title: 'Importar',
        subtitle: 'Arquivos locais e stubs',
        quickSeedTitle: 'Teste rapido',
        quickSeedHelp: 'Popular o app com dados demo locais para validar perfil, treinos, sessoes e analytics.',
        seedButton: 'Seed Demo Data',
        sampleFiles: 'Arquivos de exemplo no repo:',
        localImportTitle: 'Importacao local',
        importCsv: 'Importar CSV',
        importXlsx: 'Importar XLSX',
        importPdfStub: 'PDF (stub)',
        gsTitle: 'Google Sheets (stub)',
        sheetLink: 'Link da planilha',
        saveLink: 'Salvar link (TODO)',
        expectedFormat: 'Formato esperado (CSV/XLSX)',
        expectedText:
          'Colunas minimas: dayLabel, exercise, targetReps. Opcionais: targetWeightKg, restSeconds, notes, supersetGroupId, tagsJson.',
        warnings: 'Avisos',
        historyTitle: 'Historico de importacoes',
        selectImport: 'Selecione um registro',
        noHistory: 'Nenhuma importacao registrada.',
        cleanHistory: 'Limpar historico',
        cleanHistoryTitle: 'Limpar historico',
        cleanHistoryMessage: 'Remover todo o historico de importacoes? Isso nao apaga treinos ja importados.',
        cancel: 'Cancelar',
        clean: 'Limpar',
        historyCleaned: 'Historico de importacoes limpo.',
        enterGsLink: 'Informe um link do Google Sheets.',
        gsSavedStub: 'Link salvo como stub (TODO).',
        pdfSavedStub: 'PDF salvo como stub (metadados + TODO).',
        csvNoValid: 'CSV sem dados validos para importar.',
        xlsxNoValid: 'XLSX sem dados validos para importar.',
        csvSummary: (count: number) => `CSV: ${count} plano(s) importado(s)`,
        xlsxSummary: (count: number) => `XLSX: ${count} plano(s) importado(s)`,
        gsSummary: 'Link Google Sheets salvo (TODO: importacao local).',
        pdfSummary: 'PDF selecionado e metadados salvos (TODO: parser robusto).',
        seedDone: 'Dados demo inseridos (pode duplicar se clicar novamente).',
        refFallback: 'sem referencia',
      };
}

export default function ImportsScreen() {
  const { data, addImportRecord, importWorkoutPlans, seedDemoData, clearImportHistory } = useAppStore();
  const { colors } = useAppTheme();
  const { isEnglish } = useI18n();
  const copy = useMemo(() => getCopy(isEnglish), [isEnglish]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [status, setStatus] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string>('');

  const selectedImport = useMemo(
    () => data.imports.find((item) => item.id === selectedImportId),
    [data.imports, selectedImportId],
  );

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
    const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
    const parsed = parseWorkoutCsv(text);
    const record: ImportRecord = {
      id: makeId('import'),
      source: 'csv',
      filename: asset.name,
      uri: asset.uri,
      status: parsed.plans.length > 0 ? 'completed' : 'error',
      summary: copy.csvSummary(parsed.plans.length),
      createdAt: new Date().toISOString(),
      metadataJson: { warnings: parsed.warnings.length, rows: text.split('\n').length },
    };
    if (parsed.plans.length > 0) {
      await importWorkoutPlans(parsed.plans, record);
      setStatus(record.summary);
    } else {
      await addImportRecord({ ...record, summary: copy.csvNoValid });
      setStatus(copy.csvNoValid);
    }
    setWarnings(parsed.warnings);
    setSelectedImportId(record.id);
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
    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    const parsed = parseWorkoutXlsxBase64(base64);
    const record: ImportRecord = {
      id: makeId('import'),
      source: 'xlsx',
      filename: asset.name,
      uri: asset.uri,
      status: parsed.plans.length > 0 ? 'completed' : 'error',
      summary: copy.xlsxSummary(parsed.plans.length),
      createdAt: new Date().toISOString(),
      metadataJson: { warnings: parsed.warnings.length },
    };
    if (parsed.plans.length > 0) {
      await importWorkoutPlans(parsed.plans, record);
      setStatus(record.summary);
    } else {
      await addImportRecord({ ...record, summary: copy.xlsxNoValid });
      setStatus(copy.xlsxNoValid);
    }
    setWarnings(parsed.warnings);
    setSelectedImportId(record.id);
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
    const record: ImportRecord = {
      id: makeId('import'),
      source: 'pdf',
      filename: asset.name,
      uri: asset.uri,
      status: 'stub_todo',
      summary: copy.pdfSummary,
      createdAt: new Date().toISOString(),
      metadataJson: { mimeType: asset.mimeType ?? 'unknown', size: asset.size ?? 0 },
    };
    await addImportRecord(record);
    setStatus(copy.pdfSavedStub);
    setWarnings([]);
    setSelectedImportId(record.id);
  }

  async function handleGoogleSheetsStub() {
    const trimmed = googleSheetsUrl.trim();
    if (!trimmed) {
      setStatus(copy.enterGsLink);
      return;
    }
    const record: ImportRecord = {
      id: makeId('import'),
      source: 'googleSheets',
      googleSheetsUrl: trimmed,
      status: 'stub_todo',
      summary: copy.gsSummary,
      createdAt: new Date().toISOString(),
    };
    await addImportRecord(record);
    setStatus(copy.gsSavedStub);
    setWarnings([]);
    setGoogleSheetsUrl('');
    setSelectedImportId(record.id);
  }

  async function handleSeedDemoData() {
    await seedDemoData();
    setWarnings([]);
    setStatus(copy.seedDone);
  }

  function confirmClearHistory() {
    Alert.alert(copy.cleanHistoryTitle, copy.cleanHistoryMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.clean,
        style: 'destructive',
        onPress: () => {
          void clearImportHistory();
          setSelectedImportId('');
          setStatus(copy.historyCleaned);
          setWarnings([]);
        },
      },
    ]);
  }

  return (
    <ScreenShell title={copy.title} subtitle={copy.subtitle}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.quickSeedTitle}</Text>
        <Text style={styles.helper}>{copy.quickSeedHelp}</Text>
        <PrimaryButton label={copy.seedButton} onPress={() => void handleSeedDemoData()} variant="secondary" size="compact" />
        <Text style={styles.helper}>
          {copy.sampleFiles} <Text style={styles.code}>samples/workout-import-sample.csv</Text> /{' '}
          <Text style={styles.code}>samples/workout-import-sample.xlsx</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.localImportTitle}</Text>
        <View style={styles.row}>
          <PrimaryButton label={copy.importCsv} onPress={() => void handleCsvImport()} size="compact" />
          <PrimaryButton label={copy.importXlsx} onPress={() => void handleXlsxImport()} variant="secondary" size="compact" />
          <PrimaryButton label={copy.importPdfStub} onPress={() => void handlePdfStub()} variant="secondary" size="compact" />
        </View>

        <Text style={styles.sectionTitle}>{copy.gsTitle}</Text>
        <FormField
          label={copy.sheetLink}
          value={googleSheetsUrl}
          onChangeText={setGoogleSheetsUrl}
          placeholder="https://docs.google.com/spreadsheets/..."
        />
        <PrimaryButton label={copy.saveLink} onPress={() => void handleGoogleSheetsStub()} variant="secondary" size="compact" />

        <Text style={styles.sectionTitle}>{copy.expectedFormat}</Text>
        <Text style={styles.helper}>{copy.expectedText}</Text>

        {status ? <Text style={styles.status}>{status}</Text> : null}
        {warnings.length > 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>
              {copy.warnings} ({warnings.length})
            </Text>
            {warnings.slice(0, 8).map((warning, index) => (
              <Text key={`${warning}-${index}`} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{copy.historyTitle}</Text>
          <PrimaryButton
            label={copy.cleanHistory}
            onPress={confirmClearHistory}
            variant="danger"
            size="compact"
            disabled={data.imports.length === 0}
          />
        </View>

        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedImportId}
            style={{ color: colors.text }}
            dropdownIconColor={colors.accent}
            onValueChange={(value) => setSelectedImportId(String(value))}
          >
            <Picker.Item label={copy.selectImport} value="" />
            {data.imports.map((item) => (
              <Picker.Item
                key={item.id}
                label={`${item.source.toUpperCase()} • ${new Date(item.createdAt).toLocaleDateString(
                  isEnglish ? 'en-US' : 'pt-BR',
                )}`}
                value={item.id}
              />
            ))}
          </Picker>
        </View>

        {data.imports.length === 0 ? (
          <Text style={styles.helper}>{copy.noHistory}</Text>
        ) : selectedImport ? (
          <View style={styles.importRow}>
            <Text style={styles.importTitle}>
              {selectedImport.source.toUpperCase()} • {selectedImport.status}
            </Text>
            <Text style={styles.helper}>
              {selectedImport.filename ??
                selectedImport.googleSheetsUrl ??
                selectedImport.uri ??
                copy.refFallback}
            </Text>
            <Text style={styles.helper}>{selectedImport.summary}</Text>
            <Text style={styles.helper}>
              {new Date(selectedImport.createdAt).toLocaleString(isEnglish ? 'en-US' : 'pt-BR')}
            </Text>
          </View>
        ) : null}
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
      padding: 12,
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    pickerWrap: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      overflow: 'hidden',
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
    code: {
      fontFamily: 'monospace',
      color: colors.accent,
    },
    status: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: '600',
    },
    warningBox: {
      borderWidth: 1,
      borderColor: colors.warningBorder,
      backgroundColor: colors.warningBg,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    warningTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.warningText,
    },
    warningText: {
      fontSize: 12,
      color: colors.warningText,
    },
    importRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 4,
      backgroundColor: colors.surfaceAlt,
    },
    importTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
  });
}
