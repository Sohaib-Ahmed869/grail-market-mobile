import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { scanCard } from "../../lib/scan";
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
 *  Camera or an existing photo, and the second is not a fallback — plenty of
 *  people photograph a card at a table and open the app later. It is also the
 *  only way to exercise this on a simulator, which has no camera at all.
 *
 *  The back is optional and worth offering: a grading label is on the front,
 *  but a card number is often only legible on the back.
 *
 *  Nothing is resized before upload. Shrinking to 2000px once lost a collector
 *  number and mispriced a card by thirty times — the number is four points of
 *  type in a corner, and it is the whole identity of the card. */
export default function Scan() {
  const router = useRouter();
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  const pick = async (which: "front" | "back", from: "camera" | "library") => {
    setFailure(null);
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      // full quality, for the reason in the header comment
      quality: 1,
      allowsEditing: false,
      exif: false,
    };
    const r =
      from === "camera"
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]?.uri) return;
    (which === "front" ? setFront : setBack)(r.assets[0].uri);
  };

  const run = async () => {
    if (!front) return;
    setFailure(null);
    setBusy(true);
    setStage(0);
    // The stages are honest about what the backend is doing, but the timing is
    // estimated — it does not report progress, and pretending otherwise with a
    // percentage bar would be a lie with a number on it.
    const tick = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4200);

    const r = await scanCard(front, back ?? undefined);
    clearInterval(tick);
    setBusy(false);
    if (!r.ok) { setFailure(r.message); return; }
    setLastScan(r.scan, { front, back: back ?? undefined });
    router.push("/scanresult");
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.head}>
        <Txt variant="display">Scan a card</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
          Flat surface, even light, no glare on the case.
        </Txt>
      </View>

      <View style={s.slots}>
        <Slot
          label="Front" required uri={front}
          onCamera={() => pick("front", "camera")}
          onLibrary={() => pick("front", "library")}
          onClear={() => setFront(null)}
        />
        <Slot
          label="Back" uri={back}
          onCamera={() => pick("back", "camera")}
          onLibrary={() => pick("back", "library")}
          onClear={() => setBack(null)}
        />
      </View>

      <View style={s.body}>
        {busy ? (
          <View style={s.working}>
            <ActivityIndicator color={colors.ink} />
            <Txt variant="h3" center style={{ marginTop: space.md }}>{STAGES[stage]}…</Txt>
            <Txt variant="bodySmall" color={colors.inkFaint} center style={{ marginTop: 4 }}>
              Ten to thirty seconds. It reads the card, then prices it.
            </Txt>
          </View>
        ) : (
          <>
            {failure && <Note tone="bad" icon="alert-circle">{failure}</Note>}
            <Note icon="info">
              The back is optional, but the card number is often only readable there.
            </Note>
          </>
        )}
      </View>

      <View style={s.footer}>
        <Button label="Scan this card" onPress={run} disabled={!front} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

function Slot({
  label, uri, required, onCamera, onLibrary, onClear,
}: {
  label: string; uri: string | null; required?: boolean;
  onCamera: () => void; onLibrary: () => void; onClear: () => void;
}) {
  return (
    <View style={s.slot}>
      <Txt variant="overline" color={colors.inkFaint}>
        {label}{required ? " · required" : " · optional"}
      </Txt>
      {uri ? (
        <View style={s.shotWrap}>
          <Image source={{ uri }} style={s.shot} resizeMode="cover" />
          <Pressable onPress={onClear} style={s.clear} hitSlop={8} accessibilityLabel={`Remove ${label}`}>
            <Feather name="x" size={14} color={colors.onDark} />
          </Pressable>
        </View>
      ) : (
        <View style={s.empty}>
          <Pressable onPress={onCamera} style={s.pick} accessibilityLabel={`Photograph the ${label}`}>
            <Feather name="camera" size={19} color={colors.ink} />
            <Txt variant="bodySmall">Camera</Txt>
          </Pressable>
          <View style={s.hair} />
          <Pressable onPress={onLibrary} style={s.pick} accessibilityLabel={`Choose a ${label} photo`}>
            <Feather name="image" size={19} color={colors.ink} />
            <Txt variant="bodySmall">Upload</Txt>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm },
  slots: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl, marginTop: space.xl },
  slot: { flex: 1, gap: space.sm },
  empty: {
    aspectRatio: 0.72, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.line, borderStyle: "dashed",
    backgroundColor: colors.surfaceSunk,
    alignItems: "center", justifyContent: "center", gap: space.md,
  },
  pick: { alignItems: "center", gap: 5 },
  hair: { width: 44, height: 1, backgroundColor: colors.line },
  shotWrap: { aspectRatio: 0.72, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceSunk },
  shot: { width: "100%", height: "100%" },
  clear: {
    position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)",
  },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xl, gap: space.md },
  working: { alignItems: "center", paddingTop: space.xxl },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md },
});
