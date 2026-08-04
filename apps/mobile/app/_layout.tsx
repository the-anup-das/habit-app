import { Stack } from "expo-router";
import { useCallback } from "react";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { View, Text } from "react-native";
import { COLORS } from "@chapter/ui-tokens";
import * as SplashScreen from "expo-splash-screen";
import { SecurityProvider } from "../src/features/security/SecurityProvider";
import { SyncProvider } from "../src/features/sync/SyncProvider";

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.light.background, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SecurityProvider>
        <SyncProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: COLORS.light.background },
              headerTintColor: COLORS.light.ink1,
              contentStyle: { backgroundColor: COLORS.light.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="entry/new" options={{ presentation: "modal", title: "How are you?" }} />
            <Stack.Screen name="goals/new" options={{ presentation: "modal", title: "Create Goal" }} />
            <Stack.Screen name="settings/taxonomy" options={{ title: "Settings" }} />
          </Stack>
        </SyncProvider>
      </SecurityProvider>
    </View>
  );
}
