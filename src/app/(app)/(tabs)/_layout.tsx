import { Tabs } from 'expo-router';
import { ChartPie, List, Users } from 'lucide-react-native';

import { colors, fonts } from '@/theme';

/** Bottom navigation do Figma: Atividades | Resumo | Participantes. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 97,
          paddingTop: 16,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.regular, fontSize: 14 },
      }}
    >
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Atividades',
          tabBarAccessibilityLabel: 'Atividades',
          tabBarButtonTestID: 'tab-activities',
          tabBarIcon: ({ focused, size }) => (
            <List size={size} color={focused ? colors.brand : colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: 'Resumo',
          tabBarAccessibilityLabel: 'Resumo',
          tabBarButtonTestID: 'tab-summary',
          tabBarIcon: ({ focused, size }) => (
            <ChartPie size={size} color={focused ? colors.brand : colors.textMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="participants"
        options={{
          title: 'Participantes',
          tabBarAccessibilityLabel: 'Participantes',
          tabBarButtonTestID: 'tab-participants',
          tabBarIcon: ({ focused, size }) => (
            <Users size={size} color={focused ? colors.brand : colors.textMuted} />
          ),
        }}
      />
    </Tabs>
  );
}
