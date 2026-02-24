import { router } from 'expo-router';

import { ProfileEditorPage } from '@/src/features/profile/ProfileEditorPage';

export default function OnboardingRoute() {
  return <ProfileEditorPage mode="onboarding" onContinue={() => router.replace('/(tabs)/plans')} />;
}
