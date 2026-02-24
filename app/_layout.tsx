import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';

import { AppStoreProvider } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <AppStoreProvider>
      <RootNavigator />
    </AppStoreProvider>
  );
}

function RootNavigator() {
  const { colors, mode } = useAppTheme();
  const navTheme = mode === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          background: colors.background,
          card: colors.background,
          text: colors.text,
          border: colors.border,
          primary: colors.accent,
        },
      }}
    >
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.accent,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
        <Stack.Screen name="settings" options={{ title: 'Configs' }} />
      </Stack>
    </ThemeProvider>
  );
}
