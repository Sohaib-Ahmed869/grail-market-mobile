import { existsSync } from "node:fs";
import type { ExpoConfig } from "expo/config";

/** The app config, in code rather than app.json, for one reason: Firebase.
 *
 *  GoogleService-Info.plist and google-services.json carry project secrets, so
 *  they are not in git. Referencing them unconditionally means anyone who
 *  clones this repo — or any CI job — gets
 *
 *      Could not parse Expo config: ios.googleServicesFile
 *
 *  before they can run anything, and a build that fails on a file the repo
 *  deliberately does not ship is a bad first five minutes.
 *
 *  So the Firebase pieces are added only when the files are actually there.
 *  Drop them in the project root and phone auth wires itself up; leave them
 *  out and everything except phone verification runs.
 */
const IOS_GOOGLE = "./GoogleService-Info.plist";
const ANDROID_GOOGLE = "./google-services.json";

const hasIosFirebase = existsSync(IOS_GOOGLE);
const hasAndroidFirebase = existsSync(ANDROID_GOOGLE);
const firebase = hasIosFirebase || hasAndroidFirebase;

// Said once, plainly, rather than left as a parse error to decode. Expo
// evaluates this file several times per command, so the notice is latched on
// the process — six identical warnings is how a useful one gets ignored.
const SAID = "__grailmarket_firebase_notice__";
if (!firebase && !(globalThis as Record<string, unknown>)[SAID]) {
  (globalThis as Record<string, unknown>)[SAID] = true;
  console.warn(
    "[config] No Firebase files found — phone verification is off.\n" +
      "         Add GoogleService-Info.plist and google-services.json to the\n" +
      "         project root to switch it on. See README.",
  );
}

const NAVY = "#1A2632";

export default (): ExpoConfig => ({
  name: "GrailMarket",
  slug: "grail-market-mobile",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "grailmarket",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  backgroundColor: NAVY,
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: NAVY,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "au.com.grailmarket.app",
    ...(hasIosFirebase ? { googleServicesFile: IOS_GOOGLE } : {}),
  },
  android: {
    package: "au.com.grailmarket.app",
    adaptiveIcon: {
      backgroundColor: NAVY,
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    ...(hasAndroidFirebase ? { googleServicesFile: ANDROID_GOOGLE } : {}),
  },
  web: { favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        backgroundColor: NAVY,
        imageWidth: 220,
        resizeMode: "contain",
      },
    ],
    // Only worth adding when there is a project for them to read. The plugins
    // themselves fail the prebuild if the files are missing.
    ...(firebase
      ? [
          "@react-native-firebase/app",
          "@react-native-firebase/auth",
          ["expo-build-properties", { ios: { useFrameworks: "static" } }],
        ]
      : []),
  ] as ExpoConfig["plugins"],
});
