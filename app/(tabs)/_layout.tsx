import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0f766e',
        headerStyle: { backgroundColor: '#f7f8f4' },
        headerTitleStyle: { color: '#1f2937' },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="user" color={color} />,
        }}
      />
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
          title: 'Sessão',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="play-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <FontAwesome size={20} name="bar-chart" color={color} />,
        }}
      />
    </Tabs>
  );
}
