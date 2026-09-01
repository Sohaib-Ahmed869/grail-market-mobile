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
    // iOS terminates the app the moment a protected resource is touched
    // without a reason string. The identity SDK reaches for all of these, so a
    // missing line here is a crash in the middle of verification rather than a
    // warning at build time.
    infoPlist: {
      NSCameraUsageDescription:
        "GrailMarket uses the camera to photograph your ID and card so we can verify them.",
      NSMicrophoneUsageDescription:
        "A short video is recorded during the liveness check that confirms the ID is yours.",
      NSPhotoLibraryUsageDescription:
        "Choose an existing photo of your ID or your card instead of taking a new one.",
      NSPhotoLibraryAddUsageDescription:
        "Save a scan back to your photos.",
      NFCReaderUsageDescription:
        "Reading the chip in a passport verifies it far more reliably than a photograph can.",
    },
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
    // Both of these are unconditional, because the react-native-firebase pods
    // autolink from node_modules even when the Firebase plugins below are
    // switched off — the build hits their problems either way.
    //
    // SPM off, then static frameworks: that pairing is what react-native-
    // firebase documents. Firebase's Swift pods depend on GoogleUtilities,
    // which publishes no module map, so as plain static libraries they cannot
    // be imported from Swift at all.
    "./plugins/withRNFirebaseNoSPM",
    "@didit-protocol/sdk-react-native",
    ["expo-build-properties", { ios: { useFrameworks: "static" } }],
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
    ...(firebase ? ["@react-native-firebase/app", "@react-native-firebase/auth"] : []),
  ] as ExpoConfig["plugins"],
});
