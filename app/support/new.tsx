import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { useToast } from "../../components/Toast";
import { fileTicket, supportOptions, type TicketKind } from "../../lib/support";
import { colors, radius, space } from "../../theme";

/** File a ticket, or report somebody.
 *
 *  One screen for both, because to the person typing it is one act: something
 *  is wrong and they want a human. `kind` decides where it lands — a question
 *  starts at tier 1, a report skips tier 1 and goes to trust and safety, who
 *  can look up the people involved. The screen says which, because "we have
 *  it" and "somebody who can act on it has it" are different promises.
 *
 *  A report must name a member or a listing. Reporting nobody is not a report,
 *  and the server refuses it — so the form refuses it first rather than
 *  letting someone type three paragraphs and then be told no.
 */
export default function NewTicket() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{
    kind?: string; listingId?: string; aboutUserId?: string; about?: string; subject?: string;
  }>();

  const kind: TicketKind = params.kind === "report" ? "report" : "support";
  const listingId = params.listingId ? String(params.listingId) : null;
  const aboutUserId = params.aboutUserId ? String(params.aboutUserId) : null;

  const [categories, setCategories] = useState<string[]>(["Something else"]);
  const [category, setCategory] = useState<string>(
    kind === "report" ? (aboutUserId ? "A member" : "A listing") : "Something else",
  );
  const [subject, setSubject] = useState(params.subject ? String(params.subject) : "");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supportOptions().then((o) => setCategories(o.categories));
  }, []);

  const addPhotos = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        // Several at once: evidence is rarely one picture, and making somebody
        // repeat the picker five times is how five becomes one.
        allowsMultipleSelection: true,
        selectionLimit: Math.max(0, 10 - photos.length),
        quality: 0.8,
      });
      if (r.canceled) return;
      setPhotos((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, 10));
    } catch {
      toast("No photo library on this device.", { tone: "bad" });
    }
  };

  const shoot = async () => {
    try {
      const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (r.canceled || !r.assets?.[0]?.uri) return;
      setPhotos((p) => [...p, r.assets[0].uri].slice(0, 10));
    } catch {
      toast("No camera on this device.", { tone: "bad" });
    }
  };

  const missingSubject = kind === "report" && !listingId && !aboutUserId;
  const ready = subject.trim().length >= 3 && body.trim().length >= 10 && !missingSubject;

  const send = async () => {
    setBusy(true);
    const r = await fileTicket({
      kind, subject: subject.trim(), category, body: body.trim(),
      listingId, aboutUserId, photos,
    });
    setBusy(false);
    if (r.error || !r.ticketId) {
      toast(r.message ?? "That could not be sent.", { tone: "bad" });
      return;
    }
    toast(r.message ?? "Filed.");
    router.replace(`/support/${r.ticketId}` as never);
  };

  return (
    <Screen
      back
      footer={
        <Button
          label={busy ? "Sending" : kind === "report" ? "File this report" : "Send"}
          onPress={send}
          loading={busy}
          disabled={!ready || busy}
        />
      }
    >
      <Txt variant="display" style={{ marginTop: space.sm }}>
        {kind === "report" ? "Report Something" : "Get Help"}
      </Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        {kind === "report"
          ? "This goes straight to trust and safety, not the general desk."
          : "A person reads this. Tell us what happened and we will come back on it."}
      </Txt>

      {/* What it is about, when it is about something. Shown rather than
          hidden in the payload: somebody reporting a seller should be able to
          see that we know which seller. */}
      {(listingId || aboutUserId) && (
        <View style={s.about}>
          <Feather name={aboutUserId ? "user" : "tag"} size={14} color={colors.inkMuted} />
          <Txt variant="bodySmall" color={colors.inkMuted}>
            About {params.about ? String(params.about) : aboutUserId ? "this member" : "this listing"}
          </Txt>
        </View>
      )}

      {missingSubject && (
        <View style={{ marginTop: space.md }}>
          <Note icon="info" tone="bad">
            Open a report from the listing or the member you want to report, so
            it arrives attached to them. A report with nobody named cannot be
            acted on.
          </Note>
        </View>
      )}

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        What is it about
      </Txt>
      <View style={s.chips}>
        {categories.map((c) => {
          const on = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[s.chip, on && s.chipOn]}
            >
              <Txt variant="bodySmall" color={on ? colors.onPrimary : colors.ink}>{c}</Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        Subject
      </Txt>
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder="One line, so we can see it at a glance"
        placeholderTextColor={colors.inkFaint}
        style={s.input}
      />

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
        What happened
      </Txt>
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={
          kind === "report"
            ? "What they did, when, and what you have already tried."
            : "The more specific, the fewer times we have to come back to you."
        }
        placeholderTextColor={colors.inkFaint}
        multiline
        style={[s.input, s.area]}
      />

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
        Screenshots or photos
      </Txt>
      <Txt variant="bodySmall" color={colors.inkFaint}>
        {kind === "report"
          ? "Usually the whole case. A screenshot of the message, the card that arrived, the packaging."
          : "Optional, but a picture saves a round trip."}
      </Txt>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.sm }}>
        <View style={s.shots}>
          {photos.map((uri, i) => (
            <View key={uri + i} style={s.shot}>
              <Image source={{ uri }} style={s.shotImg} />
              <Pressable
                onPress={() => setPhotos((p) => p.filter((_, n) => n !== i))}
                style={s.remove}
                hitSlop={8}
                accessibilityLabel="Remove this photo"
              >
                <Feather name="x" size={11} color={colors.onPrimary} />
              </Pressable>
            </View>
          ))}
          {photos.length < 10 && (
            <>
              <Pressable onPress={addPhotos} style={s.add}>
                <Feather name="image" size={17} color={colors.inkMuted} />
                <Txt variant="bodySmall" color={colors.inkMuted}>Library</Txt>
              </Pressable>
              <Pressable onPress={shoot} style={s.add}>
                <Feather name="camera" size={17} color={colors.inkMuted} />
                <Txt variant="bodySmall" color={colors.inkMuted}>Camera</Txt>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  about: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    marginTop: space.md, padding: space.md,
    backgroundColor: colors.surfaceSunk, borderRadius: radius.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  input: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
  },
  area: { minHeight: 116, textAlignVertical: "top" },
  shots: { flexDirection: "row", gap: space.sm, paddingRight: space.lg },
  shot: { width: 78, height: 78, borderRadius: radius.sm, overflow: "hidden" },
  shotImg: { width: "100%", height: "100%" },
  remove: {
    position: "absolute", top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  add: {
    width: 78, height: 78, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center", gap: 3,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    borderStyle: "dashed",
    backgroundColor: colors.surface,
  },
});
