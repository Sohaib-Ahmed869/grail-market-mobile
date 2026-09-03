import { Platform } from "react-native";
import { registerPush } from "./watchlist";

// Asking for permission to interrupt someone.
//
// expo-notifications is a NATIVE module, and it is loaded here at the moment
// it is used — never at module scope. The first version imported it at the
// top of the file, which threw "Cannot find native module
// 'ExpoPushTokenManager'" on the existing dev build and took the whole app
// down: expo-router imports every route file at startup, one of those routes
// imports this, and the throw happened before anything rendered.
//
// That is the second time a native module at module scope has done this (the
// identity SDK was the first). Anything that only exists in a compiled build
// gets required inside the function that needs it, so a missing module costs
// the feature and not the app.
//
// The prompt is asked the first time someone sets an alert, not at launch:
// iOS lets you ask once, and asking on the splash screen is the surest way
// to get a permanent no.

type NotificationsModule = typeof import("expo-notifications");

function load(): { N: NotificationsModule; isDevice: boolean } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require("expo-notifications") as NotificationsModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require("expo-device") as typeof import("expo-device");
    return { N, isDevice: Boolean(Device.isDevice) };
  } catch {
    return null;
  }
}

let handlerSet = false;
let registered = false;

/** Ask, get the token, tell the backend. Safe to call repeatedly, and safe
 *  to call where notifications do not exist — it answers false rather than
 *  throwing. */
export async function enablePush(): Promise<boolean> {
  const mod = load();
  // No native module (Expo Go, a dev build made before this was added, web)
  // or a simulator, which has no push service at all.
  if (!mod || !mod.isDevice) return false;
  const { N } = mod;

  try {
    if (!handlerSet) {
      N.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      handlerSet = true;
    }

    const existing = await N.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") status = (await N.requestPermissionsAsync()).status;
    if (status !== "granted") return false;

    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("alerts", {
        name: "Price alerts",
        importance: N.AndroidImportance.DEFAULT,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants").default;
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    const token = (await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await registerPush(token, Platform.OS);
    registered = true;
    return true;
  } catch {
    return false;
  }
}

export const pushRegistered = () => registered;

export type PushStatus = "unavailable" | "granted" | "denied" | "undetermined";

/** What the OS currently thinks, without asking for anything.
 *
 *  The priming screen needs this before it renders: there is no point selling
 *  notifications to somebody who already has them, and somebody who has said
 *  no cannot be asked again — iOS only shows its dialog once, so the only
 *  honest offer at that point is a link to Settings. */
export async function pushStatus(): Promise<PushStatus> {
  const mod = load();
  if (!mod || !mod.isDevice) return "unavailable";
  try {
    const p = await mod.N.getPermissionsAsync();
    if (p.status === "granted") return "granted";
    // canAskAgain is the distinction that matters. "denied" from a first-run
    // prompt that was never shown is not the same as a person having refused.
    if (p.status === "denied" && !p.canAskAgain) return "denied";
    return p.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unavailable";
  }
}

/** Whether a notification could ever arrive on this build. The alert sheet
 *  uses it to be honest rather than promising something that cannot happen. */
export const pushPossible = () => {
  const mod = load();
  return Boolean(mod && mod.isDevice);
};
