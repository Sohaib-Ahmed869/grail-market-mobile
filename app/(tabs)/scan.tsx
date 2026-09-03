import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withRepeat, withTiming,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { JoinGate } from "../../components/JoinGate";
import { useGuest } from "../../lib/guest";
import { Txt } from "../../components/Text";
import { Icon } from "../../components/Icon";
import { PageWash } from "../../components/PageWash";
import { useTabBarClearance } from "../../components/TabBar";
import { scanCard, scanQuota, type ScanQuota } from "../../lib/scan";
import { setLastScan } from "../../lib/lastscan";
import { colors, radius, space } from "../../theme";

const STAGES = [
  "Finding the card",
  "Reading the text",
  "Reading the grading label",
  "Matching the catalogue",
  "Pricing it",
];

/** Scan.
 *
 *  A viewfinder, not a form. The previous version was two upload slots on a
 *  white page, which described the mechanism rather than the act — and the
 *  act is holding a card up to a phone. So: a dark frame the card sits inside,
 *  gold brackets marking the corners, a sweep line moving down it, and one
 *  shutter. The two slots survive as thumbnails, because the back genuinely
 *  matters and hiding it would cost card numbers.
 *
 *  Light, like the rest of the app. A dark camera surface is the convention
 *  when you are looking through a live lens — but this screen holds a
 *  photograph you already took, on a page that sits between two light ones,
 *  and switching the whole app to black for one step reads as a different
 *  product. The frame itself stays deep so the card is the bright thing.
 *
 *  Nothing is resized before upload. Shrinking to 2000px once lost a collector
 *  number and mispriced a card by thirty times — the number is four points of
 *  type in a corner, and it is the whole identity of the card.
 */
export default function Scan() {
  // Refreshed on focus rather than once on mount: coming back from a scan is
  // exactly when the number has changed.
  const clearance = useTabBarClearance();
  const [quota, setQuota] = useState<ScanQuota | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      scanQuota().then((q) => { if (alive) setQuota(q); });
      return () => { alive = false; };
    }, []),
  );

  const guest = useGuest();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  // The sweep. Runs while the frame is empty or while the scan is working —
  // in both cases something is happening and the line says so.
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }), -1, true,
    );
    return () => cancelAnimation(sweep);
  }, [sweep]);

  const frameW = Math.min(width - space.xl * 2, 300);
  const frameH = frameW * 1.38;          // a card is 63 x 88mm

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [10, frameH - 10]) }],
    opacity: interpolate(sweep.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  }));

  const shown = side === "front" ? front : back;

  const pick = async (from: "camera" | "library") => {
    setFailure(null);
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"], quality: 1, allowsEditing: false, exif: false,
    };
    try {
      const r = from === "camera"
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.[0]?.uri) return;
      (side === "front" ? setFront : setBack)(r.assets[0].uri);
      // Front done, back is the obvious next thing to ask for.
      if (side === "front" && !back) setSide("back");
    } catch {
      setFailure("No camera on this device. Choose a photo instead.");
    }
  };

  const run = async () => {
    if (!front) return;
    setFailure(null);
    setBusy(true);
    setStage(0);
    // Honest about what the backend is doing; the timing is estimated. It
    // reports no progress, and a percentage bar would be a lie with a number
    // on it.
    const tick = setInterval(() => setStage((n) => Math.min(n + 1, STAGES.length - 1)), 4200);
    const r = await scanCard(front, back ?? undefined);
    clearInterval(tick);
    setBusy(false);
    if (!r.ok) { setFailure(r.message); return; }
    setLastScan(r.scan, { front, back: back ?? undefined });
    router.push("/scanresult");
  };

  if (guest) {
    return (
      <JoinGate
        icon={"maximize"}
        title="Scanning needs an account"
        why="Every scan buys a real price lookup, so it is tied to a member rather than a device."
        points={[
          "Free scans every day on any plan",
          "Corrections you make are remembered",
          "Add what you scan straight to a collection",
        ]}
      />
    );
  }

  return (
    <View style={s.root}>
      <PageWash />

      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Txt variant="h2">Scan A Card</Txt>
            {/* Asked before the camera opens, so nobody takes a photograph
                they cannot use. Silent when there is no ceiling — "unlimited
                scans remaining" is a sentence nobody needs. */}
            {quota?.remaining != null && (
              <Txt
                variant="bodySmall"
                color={quota.remaining === 0 ? colors.down : colors.inkFaint}
              >
                {quota.remaining === 0
                  ? `No scans left — they reset on ${quota.resetsOn ?? "the 1st"}`
                  : `${quota.remaining} scan${quota.remaining === 1 ? "" : "s"} left this month`}
              </Txt>
            )}
          </View>
          <View style={s.sides}>
            {(["front", "back"] as const).map((x) => {
              const on = side === x;
              const has = x === "front" ? front : back;
              return (
                <Pressable key={x} onPress={() => setSide(x)} style={[s.side, on && s.sideOn]}>
                  {has && <View style={s.sideDot} />}
                  <Txt variant="bodySmall" color={on ? colors.onPrimary : colors.inkMuted}>
                    {x === "front" ? "Front" : "Back"}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---- the viewfinder ------------------------------------------- */}
        <View style={s.stage}>
          <Pressable
            onPress={() => (shown ? undefined : pick("camera"))}
            style={[s.frame, { width: frameW, height: frameH }]}
          >
            {shown ? (
              <>
                <Image source={{ uri: shown }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <Pressable
                  onPress={() => (side === "front" ? setFront(null) : setBack(null))}
                  style={s.retake}
                  hitSlop={8}
                >
                  <Icon name="photo" size={15} color={colors.onDark} />
                  <Txt variant="bodySmall" color={colors.onDark}>Retake</Txt>
                </Pressable>
              </>
            ) : (
              <>
                <Animated.View style={[s.sweep, sweepStyle]}>
                  <LinearGradient
                    colors={["transparent", colors.accent, "transparent"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ height: 2, width: "100%" }}
                  />
                </Animated.View>
                <Icon name="card" size={34} color="rgba(255,255,255,0.28)" />
                <Txt variant="bodySmall" color={colors.onDarkMuted} center style={{ marginTop: space.md }}>
                  Fill the frame with the {side}
                </Txt>
              </>
            )}

            {/* corners, drawn as four brackets rather than a border: a full
                outline reads as a box, brackets read as an aim */}
            {([["tl", {}], ["tr", {}], ["bl", {}], ["br", {}]] as const).map(([k]) => (
              <View key={k} style={[s.corner, s[k]]} />
            ))}
          </Pressable>

          {busy ? (
            <View style={s.working}>
              <Txt variant="h3" center>{STAGES[stage]}…</Txt>
              <View style={s.bar}>
                <View style={[s.barFill, { width: `${((stage + 1) / STAGES.length) * 100}%` }]} />
              </View>
              <Txt variant="bodySmall" color={colors.inkFaint} center style={{ marginTop: 6 }}>
                Ten to thirty seconds. It reads the card, then prices it.
              </Txt>
            </View>
          ) : failure ? (
            <View style={s.failure}>
              <Icon name="notify" size={15} color={colors.down} filled />
              <Txt variant="bodySmall" color={colors.ink} style={{ flex: 1 }}>{failure}</Txt>
            </View>
          ) : (
            <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.lg }}>
              {back
                ? "Both sides captured."
                : front
                  ? "The back is optional — but the card number is often only readable there."
                  : "Flat surface, even light, no glare on the case."}
            </Txt>
          )}
        </View>

        {/* ---- the controls ---------------------------------------------- */}
        <View style={[s.controls, { paddingBottom: clearance }]}>
          <Pressable onPress={() => pick("library")} style={s.round} accessibilityLabel="Choose a photo">
            <Icon name="photo" size={21} color={colors.ink} />
          </Pressable>

          {front && !busy ? (
            <Pressable onPress={run} style={[s.shutter, s.shutterGo]} accessibilityLabel="Scan this card">
              <Icon name="scan" size={30} color={colors.dark} filled />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => pick("camera")}
              disabled={busy}
              style={[s.shutter, busy && { opacity: 0.4 }]}
              accessibilityLabel={`Photograph the ${side}`}
            >
              <View style={s.shutterInner} />
            </Pressable>
          )}

          <View style={s.round}>
            {back ? (
              <Image source={{ uri: back }} style={s.thumb} resizeMode="cover" />
            ) : front ? (
              <Image source={{ uri: front }} style={s.thumb} resizeMode="cover" />
            ) : (
              <Icon name="card" size={20} color={colors.inkFaint} />
            )}
          </View>
        </View>

        {front && !busy && (
          <Txt variant="bodySmall" color={colors.accent} center
            style={{ position: "absolute", left: 0, right: 0, bottom: 96 }}>
            Tap the gold button to price it
          </Txt>
        )}
      </SafeAreaView>
    </View>
  );
}

const BRACKET = 30;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },

  head: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.md,
  },
  sides: { flexDirection: "row", gap: space.sm },
  side: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: space.lg, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.fieldLine, backgroundColor: colors.surface,
  },
  sideOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  sideDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.up },

  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xl },
  frame: {
    borderRadius: 18, overflow: "hidden",
    backgroundColor: colors.dark,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#0B1622", shadowOpacity: 0.22, shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  sweep: { position: "absolute", left: 0, right: 0, top: 0 },
  corner: {
    position: "absolute", width: BRACKET, height: BRACKET,
    borderColor: colors.accent, borderWidth: 0,
  },
  tl: { top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
  tr: { top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
  bl: { bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
  br: { bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },
  retake: {
    position: "absolute", bottom: 10, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.pill,
    backgroundColor: "rgba(11,22,34,0.72)",
  },

  working: { marginTop: space.xl, alignSelf: "stretch" },
  bar: {
    height: 3, borderRadius: 2, marginTop: space.md,
    backgroundColor: colors.line, overflow: "hidden",
  },
  barFill: { height: 3, borderRadius: 2, backgroundColor: colors.accent },
  failure: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    marginTop: space.xl, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.downWash,
  },

  controls: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xxl, paddingTop: space.lg,
  },
  round: {
    width: 52, height: 52, borderRadius: 26, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.fieldLine,
  },
  thumb: { width: "100%", height: "100%" },
  shutter: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: colors.lineStrong,
  },
  shutterInner: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.ink,
  },
  shutterGo: {
    backgroundColor: colors.accent, borderColor: "rgba(255,255,255,0.5)",
    shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
});
