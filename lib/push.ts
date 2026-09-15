import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { forgetPush, registerPush } from "./watchlist";

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
  // Same shape as `lib/paste.ts`, and for the same reason.
  //
  // `expo-notifications` resolves a dozen native modules at IMPORT time —
  // ExpoPushTokenManager, ExpoNotificationsEmitter and the rest each run
  // `requireNativeModule(...)` at module scope. On a binary built before the
  // dependency was added that throws while the module is still evaluating,
  // early enough that the catch below never sees it, and the screen dies with
  // "Cannot find native module 'ExpoPushTokenManager'". It took /alerts down
  // and, because the error screen persists across navigation, every screen
  // opened after it.
  //
  // `requireOptionalNativeModule` asks the same question and answers null
  // instead of throwing, so the JS wrapper is only imported once its native
  // half is known to be present.
  if (!requireOptionalNativeModule("ExpoPushTokenManager")) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const N = require("expo-notifications") as NotificationsModule;
    const Device = requireOptionalNativeModule<{ isDevice?: boolean }>("ExpoDevice");
    return { N, isDevice: Boolean(Device?.isDevice) };
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

/** Stop sending to this device.
 *
 *  The OS permission is deliberately left alone. An app cannot revoke its own
 *  notification permission, and asking somebody to go to Settings to turn one
 *  category off is a worse answer than simply not sending — so "off" here
 *  means the server forgets where to send, which is the part we control and
 *  the part that actually stops the buzzing. */
export async function disablePush(): Promise<boolean> {
  const mod = load();
  if (!mod || !mod.isDevice) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require("expo-constants").default;
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const token = (await mod.N.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await forgetPush(token);
    registered = false;
    return true;
  } catch {
    return false;
  }
}

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

// ---- opening what was tapped --------------------------------------------------

/** Tapping a notification opens the thing it is about.
 *
 *  The backend has always sent a route with each push (`data.href`, set by
 *  `notify()`), and nothing here read it: a tap on "New offer on your
 *  Charizard" opened the app on whatever screen it was last left on, and the
 *  person had to find the offer themselves.
 *
 *  Two ways a tap arrives. With the app running, the response listener fires.
 *  With the app closed, the tap is what LAUNCHED it, and that response is
 *  collected once at boot — which is the case that matters most, because a
 *  push is usually read on a locked phone. Each response is handled once, by
 *  its identifier, so a warm start cannot replay the cold-start tap.
 *
 *  Only in-app routes are followed. A push that carried a full URL would
 *  otherwise be a way to open anything from a notification. */
export function listenForTaps(open: (href: string) => void): () => void {
  const mod = load();
  if (!mod) return () => {};
  const { N } = mod;
  const seen = new Set<string>();
  const follow = (r: { notification: { request: { identifier: string; content: { data?: Record<string, unknown> } } } } | null) => {
    if (!r) return;
    const id = r.notification.request.identifier;
    if (seen.has(id)) return;
    seen.add(id);
    const href = r.notification.request.content.data?.href;
    if (typeof href === "string" && href.startsWith("/") && !href.startsWith("//")) open(href);
  };
  let sub: { remove: () => void } | null = null;
  try {
    sub = N.addNotificationResponseReceivedListener(follow);
    N.getLastNotificationResponseAsync().then(follow).catch(() => {});
  } catch {
    // A build without the native half: no taps to follow.
  }
  return () => sub?.remove();
}

// ---- asking at the moment it is useful ----------------------------------------

let offeredThisRun = false;
const OFFERED_KEY = "push-offered";

/** Offer notifications once, right after somebody does something that will
 *  have a reply — an offer sent, a counter, an accepted deal.
 *
 *  That is the moment the value is obvious ("tell me when they answer") and
 *  the ask is not a stranger's. It is offered once per install and never
 *  again, whether it was taken or not: asking twice is nagging, and iOS only
 *  shows its own dialog once anyway. Somebody who already has push on, or
 *  who has refused at the OS level, is never asked. */
export async function offerPushAfterAction(
  toast: (text: string, opts?: { tone?: "good" | "bad" | "info"; action?: { label: string; onPress: () => void } }) => void,
): Promise<void> {
  if (offeredThisRun) return;
  if ((await pushStatus()) !== "undetermined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require("expo-secure-store") as typeof import("expo-secure-store");
    if (await SecureStore.getItemAsync(OFFERED_KEY)) return;
    await SecureStore.setItemAsync(OFFERED_KEY, "1");
  } catch {
    // No keychain (web): fall back to once per run.
  }
  offeredThisRun = true;
  toast("Want to know the moment they reply?", {
    tone: "info",
    action: { label: "Turn on alerts", onPress: () => { void enablePush(); } },
  });
}

