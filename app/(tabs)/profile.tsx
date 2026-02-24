import { ScreenShell } from '@/src/components/ScreenShell';
import { PlaceholderCard } from '@/src/components/PlaceholderCard';

export default function ProfileScreen() {
  return (
    <ScreenShell title="Perfil" subtitle="Dados locais do usuário (MVP offline)">
      <PlaceholderCard
        title="Milestone 1"
        body="Tela de perfil com formulário local (nome, idade, altura, peso, nível de experiência, sedentarismo e objetivos)."
      />
    </ScreenShell>
  );
}
