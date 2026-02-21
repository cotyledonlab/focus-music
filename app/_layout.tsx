import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { theme } from "../src/constants/theme";
import { PlayerProvider } from "../src/context/PlayerContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg0 },
            animation: "fade"
          }}
        />
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
