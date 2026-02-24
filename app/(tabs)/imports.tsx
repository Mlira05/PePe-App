import { ScreenShell } from '@/src/components/ScreenShell';
import { PlaceholderCard } from '@/src/components/PlaceholderCard';

export default function ImportsScreen() {
  return (
    <ScreenShell title="Importar" subtitle="Arquivos locais e stubs">
      <PlaceholderCard
        title="Milestone 3"
        body="CSV e XLSX completos com Document Picker; PDF e Google Sheets como fluxo stub com metadados salvos localmente."
      />
    </ScreenShell>
  );
}
