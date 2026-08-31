import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { colors } from "../theme";

// Hold the native splash until the fonts are in. Called at module scope, as
// the SDK 57 docs require — inside a component it races the first render.
SplashScreen.preventAutoHideAsync().catch(() => {});
// setOptions is a no-op in Expo Go and logs a warning every reload. The
// native splash it configures only exists in a real build anyway, so ask for
// it there and stay quiet here.
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  SplashScreen.setOptions({ duration: 300, fade: true });
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // A font that will not load must not cost the user the app. We show the UI
  // in the system face rather than holding a navy screen forever.
  const ready = loaded || Boolean(error);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.surface },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
      </Stack>
    </>
  );
}
