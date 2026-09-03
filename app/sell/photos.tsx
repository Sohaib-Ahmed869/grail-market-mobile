import { useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { SellSteps } from "../../components/SellSteps";
import { getDraft, patchDraft } from "../../lib/selldraft";
import { GraderBadge } from "../../components/GraderChips";
import { gradeLabel } from "../../lib/grading";
import { colors, radius, space } from "../../theme";

/** The ten angles, in the order they are asked for.
 *
 *  Prescribed rather than a free gallery, and that is the point: a downloaded
 *  stock photo cannot satisfy ten specific angles of one physical card. It is
 *  the cheapest possible proof that the seller is holding the thing. */
const ANGLES = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "front-tl", label: "Front ↖" },
  { key: "front-tr", label: "Front ↗" },
  { key: "front-bl", label: "Front ↙" },
  { key: "front-br", label: "Front ↘" },
  { key: "back-tl", label: "Back ↖" },
  { key: "back-tr", label: "Back ↗" },
  { key: "back-bl", label: "Back ↙" },
  { key: "back-br", label: "Back ↘" },
] as const;

/** Below this, a listing is not worth publishing.
 *
 *  Four is the floor because it is the smallest set that shows both faces and
 *  proves the seller turned the card over — front, back, and two corners. Ten
 *  earns the Photo Verified mark. The gap between the two is deliberate: the
 *  mark has to be worth something, and a floor nobody can clear just stops
 *  people listing. */
const MIN_SHOTS = 4;

export default function SellPhotos() {
  const router = useRouter();
  const draft = getDraft();
  const [shots, setShots] = useState<Record<string, string>>({});
  const [video, setVideo] = useState<string | null>(null);

  const taken = Object.keys(shots).length;
  const allTen = taken >= ANGLES.length;
  const enough = taken >= MIN_SHOTS;

  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.9 };

  const fromLibrary = async (key: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo access needed", "Allow photo access to pick pictures of the card.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled && r.assets?.[0]?.uri) setShots((s) => ({ ...s, [key]: r.assets[0].uri }));
  };

  const fromCamera = async (key: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera needed", "Allow camera access, or choose an existing photo instead.");
      return;
    }
    try {
      const r = await ImagePicker.launchCameraAsync(opts);
      if (!r.canceled && r.assets?.[0]?.uri) setShots((s) => ({ ...s, [key]: r.assets[0].uri }));
    } catch {
      // The simulator has no camera and neither does a browser. Falling back
      // rather than failing is the difference between a tile that does
      // nothing and one that works everywhere it is tested.
      Alert.alert(
        "No camera here",
        "This device has no camera available. Pick an existing photo instead.",
        [{ text: "Cancel", style: "cancel" }, { text: "Choose photo", onPress: () => fromLibrary(key) }],
      );
    }
  };

  /** Tapping a tile asks which, rather than assuming the camera.
   *
   *  Assuming it is what made this screen dead on a simulator: the camera
   *  sheet cannot open, nothing is thrown that the UI could show, and the tap
   *  simply has no effect. */
  const capture = (key: string) => {
    if (Platform.OS === "web") return fromLibrary(key);
    Alert.alert("Add a photo", ANGLES.find((a) => a.key === key)?.label ?? "", [
      { text: "Take a photo", onPress: () => fromCamera(key) },
      { text: "Choose from library", onPress: () => fromLibrary(key) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickVideo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 0.8 });
    if (!r.canceled && r.assets?.[0]?.uri) setVideo(r.assets[0].uri);
  };

  const next = () => {
    patchDraft({ photos: Object.entries(shots).map(([angle, url]) => ({ angle, url })) });
    router.push("/sell/price");
  };

  return (
    <Screen
      back
      footer={
        <>
          <Button label="Next · Price" onPress={next} disabled={!enough} />
          <Txt variant="bodySmall" color={enough ? colors.inkFaint : colors.accent} center>
            {!enough
              ? `${MIN_SHOTS - taken} more photo${MIN_SHOTS - taken === 1 ? "" : "s"} needed to list`
              : allTen
                ? "All ten captured · Photo Verified"
                : `${ANGLES.length - taken} more for the Photo Verified mark`}
          </Txt>
        </>
      }
    >
      <SellSteps step={2} />
      <View style={s.listingStrip}>
        <GraderBadge grader={draft?.isRaw ? "RAW" : draft?.grader} grade={draft?.grade} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>{draft?.cardName ?? "This card"}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
            {[draft?.setName,
              draft?.grader ? gradeLabel(draft.grader, draft.grade) : gradeLabel("RAW", draft?.grade),
            ].filter(Boolean).join(" · ")}
          </Txt>
        </View>
      </View>
      <Txt variant="display" style={{ marginTop: space.lg }}>Photograph It</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Front, back and all eight corners. {taken} of {ANGLES.length} captured —
        {" "}{MIN_SHOTS} is the minimum to list.
      </Txt>

      <View style={s.grid}>
        {ANGLES.map((a) => {
          const uri = shots[a.key];
          return (
            <Pressable
              key={a.key}
              onPress={() => capture(a.key)}
              onLongPress={() => fromLibrary(a.key)}
              style={[s.tile, uri && s.tileDone]}
            >
              {uri ? (
                <>
                  <Image source={{ uri }} style={s.tileImg} resizeMode="cover" />
                  <View style={s.tick}><Feather name="check" size={11} color={colors.onPrimary} /></View>
                </>
              ) : (
                <>
                  <Feather name="camera" size={15} color={colors.inkFaint} />
                  <Txt variant="overline" color={colors.inkFaint} style={s.tileLabel}>{a.label}</Txt>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
      <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
        Tap a square to add a photo. Hold to skip straight to your library.
      </Txt>

      <View style={{ marginTop: space.xl }}>
        <View style={s.videoHead}>
          <Txt variant="h3">Add a video</Txt>
          <Txt variant="overline" color={colors.inkFaint}>Optional</Txt>
        </View>
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
          Ten seconds turning the card in your hand. It plays first, ahead of the stills.
        </Txt>
        <Pressable onPress={pickVideo} style={[s.videoBtn, video && s.videoOn]}>
          <Feather name={video ? "check-circle" : "video"} size={17}
            color={video ? colors.up : colors.ink} />
          <Txt variant="button">{video ? "Video attached" : "Choose a video"}</Txt>
        </Pressable>
      </View>

      <View style={{ marginTop: space.lg }}>
        <Note tone={allTen ? "good" : "accent"} icon={allTen ? "check-circle" : "alert-triangle"}>
          {allTen
            ? "All ten captured. This listing carries the Photo Verified mark."
            : `At least ${MIN_SHOTS} photos to list; all ten earns the Photo Verified mark, which buyers filter on. A video never replaces them — it just sells the card faster.`}
        </Note>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  listingStrip: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    marginTop: space.md, padding: space.md,
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xl },
  tile: {
    width: "18.4%", aspectRatio: 0.78, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.line, borderStyle: "dashed",
    backgroundColor: colors.surfaceSunk,
    alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 3,
  },
  tileDone: { borderStyle: "solid", borderColor: colors.up },
  tileImg: { ...StyleSheet.absoluteFillObject },
  tileLabel: { fontSize: 7, letterSpacing: 0.3 },
  tick: {
    position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.up, alignItems: "center", justifyContent: "center",
  },
  videoHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  videoBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 50, marginTop: space.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface,
  },
  videoOn: { borderColor: colors.up, backgroundColor: colors.upWash },
});
