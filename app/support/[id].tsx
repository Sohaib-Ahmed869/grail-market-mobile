import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Loader } from "../../components/Loader";
import { useToast } from "../../components/Toast";
import { replyToTicket, ticket, type TicketDetail } from "../../lib/support";
import { colors, radius, space } from "../../theme";

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
};

/** One ticket, as a conversation.
 *
 *  Internal notes never arrive here — the API filters them — so what is on
 *  screen is exactly what both sides have said to each other. */
export default function TicketThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [data, setData] = useState<TicketDetail | null | undefined>(undefined);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    ticket(String(id)).then((t) => { if (alive) setData(t); });
    return () => { alive = false; };
  }, [id]);
  useFocusEffect(load);

  const addPhotos = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: true,
      selectionLimit: Math.max(0, 10 - photos.length), quality: 0.8,
    });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, 10));
  };

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const ok = await replyToTicket(String(id), body.trim(), photos);
    setBusy(false);
    if (!ok) { toast("That could not be sent.", { tone: "bad" }); return; }
    setBody(""); setPhotos([]);
    load();
  };

  if (data === undefined) return <Screen back><Loader fill /></Screen>;
  if (data === null) {
    return (
      <Screen back>
        <Txt variant="h2" center style={{ marginTop: space.xxxl }}>Not Found</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
          This ticket does not exist, or it is not yours.
        </Txt>
      </Screen>
    );
  }

  const t = data.ticket;
  const closed = t.status === "resolved";

  return (
    <Screen
      back
      footer={
        <View style={{ gap: space.sm }}>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                {photos.map((uri, i) => (
                  <View key={uri + i} style={s.thumb}>
                    <Image source={{ uri }} style={s.thumbImg} />
                    <Pressable
                      onPress={() => setPhotos((p) => p.filter((_, n) => n !== i))}
                      style={s.remove} hitSlop={8}
                    >
                      <Feather name="x" size={10} color={colors.onPrimary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          <View style={s.composer}>
            <Pressable onPress={addPhotos} style={s.clip} hitSlop={6} accessibilityLabel="Attach a photo">
              <Feather name="paperclip" size={17} color={colors.inkMuted} />
            </Pressable>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={closed ? "Reply to reopen this" : "Write a reply"}
              placeholderTextColor={colors.inkFaint}
              multiline
              style={s.field}
            />
            <Button label="Send" onPress={send} loading={busy} disabled={!body.trim() || busy} />
          </View>
        </View>
      }
    >
      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.sm }}>
        {t.kind === "report" ? "Report" : "Support"} · {t.category}
      </Txt>
      <Txt variant="h1" style={{ marginTop: 2 }}>{t.subject}</Txt>
      <Txt variant="bodySmall" color={closed ? colors.up : colors.inkMuted} style={{ marginTop: 4 }}>
        {closed
          ? "Closed. Writing here opens it again."
          : t.status === "waiting"
            ? "Waiting on you."
            : "With us. You will get a notification when we reply."}
      </Txt>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        {data.messages.map((m) => {
          const mine = m.author === "member";
          return (
            <View key={m.message_id} style={[s.msg, mine ? s.mine : s.theirs]}>
              <Txt variant="overline" color={colors.inkFaint}>
                {mine ? "You" : m.author_name || "Grail Market"} · {day(m.created_at)}
              </Txt>
              <Txt variant="body" style={{ marginTop: 3 }}>{m.body}</Txt>
              {m.photos && m.photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.sm }}>
                  <View style={{ flexDirection: "row", gap: space.sm }}>
                    {m.photos.map((u) => (
                      <Image key={u} source={{ uri: u }} style={s.attached} />
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  msg: { padding: space.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  mine: { backgroundColor: colors.surface, borderColor: colors.line },
  theirs: { backgroundColor: colors.surfaceSunk, borderColor: colors.line },
  attached: { width: 108, height: 108, borderRadius: radius.sm },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  clip: { paddingBottom: space.md },
  field: {
    flex: 1, maxHeight: 110, padding: space.md,
    borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
    backgroundColor: colors.surface, color: colors.ink, fontSize: 15,
  },
  thumb: { width: 54, height: 54, borderRadius: radius.sm, overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
  remove: {
    position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)",
  },
});
