import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '@/src/theme/useAppTheme';

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useAppTheme();

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
          title: 'Treinos',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="list-alt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="imports"
        options={{
          title: 'Importar',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="upload" color={color} />,
        }}
      />
      <Tabs.Screen
        name="runner"
        options={{
          title: 'Sessao',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="play-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
