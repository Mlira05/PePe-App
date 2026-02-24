import { ScreenShell } from '@/src/components/ScreenShell';
import { PlaceholderCard } from '@/src/components/PlaceholderCard';

export default function RunnerScreen() {
  return (
    <ScreenShell title="Sessão" subtitle="READ + LISTEN (coach timeline TTS)">
      <PlaceholderCard
        title="Milestones 4 e 5"
        body="Runner com instruções em pt-BR, timer de descanso, log de reps/carga e modo LISTEN com TTS por eventos (sem contagem de repetições)."
      />
    </ScreenShell>
  );
}
