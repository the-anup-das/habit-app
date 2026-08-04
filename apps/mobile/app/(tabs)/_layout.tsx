import { Tabs } from 'expo-router';
import { COLORS } from "@chapter/ui-tokens";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.light.background },
        headerTintColor: COLORS.light.ink1,
        tabBarStyle: { 
          backgroundColor: COLORS.light.background,
          borderTopColor: COLORS.light.surface2,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarActiveTintColor: COLORS.light.primary,
        tabBarInactiveTintColor: COLORS.light.ink3,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Timeline',
          tabBarLabel: 'Timeline',
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarLabel: 'Goals',
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarLabel: 'Stats',
        }}
      />
    </Tabs>
  );
}
