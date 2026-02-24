import { ScreenShell } from '@/src/components/ScreenShell';
import { PlaceholderCard } from '@/src/components/PlaceholderCard';

export default function PlansScreen() {
  return (
    <ScreenShell title="Treinos" subtitle="CRUD de planos e exercícios">
      <PlaceholderCard
        title="Milestone 2"
        body="Cadastro de WorkoutPlan (rótulo do dia), exercícios, séries, metas de reps/carga, descanso, notas e grupos de superset."
      />
    </ScreenShell>
  );
}
