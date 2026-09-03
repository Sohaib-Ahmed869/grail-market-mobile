import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { ToastHost } from "../components/Toast";
import { colors } from "../theme";
import { loadSession } from "../lib/session";

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
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  // A font that will not load must not cost the user the app. We show the UI
  // in the system face rather than holding a navy screen forever.
  const ready = loaded || Boolean(error);

  // The keychain read happens once, at boot, so no screen has to wonder
  // whether the session has loaded yet.
  useEffect(() => { loadSession().catch(() => {}); }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ToastHost>
      {/* Dark glyphs, because the app runs light — see the note in the
          palette. The three dark screens (splash, welcome, the auth hero)
          each set "light" for themselves; a global "light" put a white clock
          on a white screen everywhere else. */}
      <StatusBar style="dark" />
      {/* Transitions carry meaning, so they are not all the same.
        *
        * Pushing deeper — a listing, a seller, a thread — slides in from the
        * right, which is the direction the back gesture will take it out.
        * Things that are a decision rather than a place come up from the
        * bottom as a sheet: the composer, the avatar picker. The splash does
        * not animate in at all, because it IS the first frame and animating
        * it would mean animating over the OS splash it has to match. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.washBottom },
          animation: "slide_from_right",
          animationDuration: 420,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade", animationDuration: 340 }} />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="avatar" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
        <Stack.Screen name="community/new" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
        <Stack.Screen name="community/make" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
      </Stack>
    </ToastHost>
  );
}
