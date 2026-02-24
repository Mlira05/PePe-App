import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/src/i18n/useI18n';
import { useAppStore } from '@/src/state/AppStore';
import { useAppTheme } from '@/src/theme/useAppTheme';

export default function TabLayout() {
  const router = useRouter();
  const { data, saveSettings } = useAppStore();
  const { colors } = useAppTheme();
  const { t, isEnglish } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 12, marginRight: 6 }}>
            <Pressable
              onPress={() =>
                void saveSettings({
                  ...data.settings,
                  language: isEnglish ? 'pt-BR' : 'en',
                })
              }
            >
              <FontAwesome size={18} name="globe" color={colors.accent} />
            </Pressable>
            <Pressable onPress={() => router.push('/profile')}>
              <FontAwesome size={20} name="user-circle-o" color={colors.accent} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings' as never)}>
              <FontAwesome size={20} name="cog" color={colors.accent} />
            </Pressable>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="plans"
        options={{
          title: t('tabs.plans'),
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="list-alt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="imports"
        options={{
          title: t('tabs.imports'),
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="upload" color={color} />,
        }}
      />
      <Tabs.Screen
        name="runner"
        options={{
          title: t('tabs.session'),
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="play-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.analytics'),
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
