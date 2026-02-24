import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';

export default function AppEntryRoute() {
  const { data, isReady } = useAppStore();
  const { colors } = useAppTheme();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>Carregando...</Text>
      </View>
    );
  }

  const isRegistered = Boolean(data.profile.name.trim());
  return <Redirect href={(isRegistered ? '/(tabs)/plans' : '/onboarding') as never} />;
}
