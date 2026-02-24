import { ScreenShell } from '@/src/components/ScreenShell';
import { PlaceholderCard } from '@/src/components/PlaceholderCard';

export default function HistoryScreen() {
  return (
    <ScreenShell title="Histórico" subtitle="Sessões, PRs e estatísticas básicas">
      <PlaceholderCard
        title="Milestone 6"
        body="Lista/detalhes de sessões e analytics: dias por semana, volume total por exercício e PRs simples."
      />
    </ScreenShell>
  );
}
