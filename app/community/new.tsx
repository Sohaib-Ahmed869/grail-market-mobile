import { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { communities, write, type Community } from "../../lib/community";
import { useToast } from "../../components/Toast";
import { colors, radius, space, type } from "../../theme";

/** Writing a post.
 *
 *  Community first, then a title, then everything optional. The order is the
 *  order the decision is actually made in — people know what they want to say
 *  and where before they know how to word it, and a form that opens with an
 *  empty body box invites a wall of text nobody reads. */
export default function NewPost() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();

  const [subs, setSubs] = useState<Community[]>([]);
  const [slug, setSlug] = useState<string | null>(
    typeof params.slug === "string" ? params.slug : null,
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => { communities().then(setSubs); }, []);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!r.canceled && r.assets?.[0]?.uri) setImage(r.assets[0].uri);
  };

  const submit = async () => {
    if (!slug || title.trim().length < 3) return;
    setBusy(true);
    // Only a real URL travels. A picked photo on this device is a local file
    // or a data URI — neither means anything to anyone else, and storing one
    // would put megabytes of base64 in a text column.
    const linkable = image && /^https?:\/\//.test(image) ? image : null;
    const r = await write({ slug, title: title.trim(), body: body.trim() || undefined, imageUrl: linkable });
    setBusy(false);
    if (!r.postId) { toast(r.message ?? "That post could not be sent.", { tone: "bad" }); return; }
    if (r.masked && r.notice) {
      // Posted, but changed. Saying so is the difference between a rule and
      // a surprise.
      Alert.alert("Contact details removed", r.notice, [
        { text: "See the post", onPress: () => router.replace(`/community/post/${r.postId}` as any) },
      ]);
      return;
    }
    toast("Posted.");
    router.replace(`/community/post/${r.postId}` as any);
  };

  const ready = Boolean(slug) && title.trim().length >= 3;
  const here = subs.find((c) => c.slug === slug);

  return (
    <Screen
      back
      footer={
        <>
          <Button label={busy ? "Posting" : "Post"} onPress={submit} disabled={!ready} loading={busy} />
          {!ready && (
            <Txt variant="bodySmall" color={colors.inkFaint} center>
              {slug ? "A title is needed" : "Pick a community first"}
            </Txt>
          )}
                  </>
      }
    >
      <Txt variant="display" style={{ marginTop: space.sm }}>New Post</Txt>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        Where Does It Go
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail}>
        {subs.map((c) => {
          const on = slug === c.slug;
          return (
            <Pressable key={c.slug} onPress={() => setSlug(c.slug)} style={[s.chip, on && s.chipOn]}>
              <View style={[s.dot, { backgroundColor: c.accent ?? colors.ink }]} />
              <Txt variant="bodySmall" color={on ? colors.onPrimary : colors.inkMuted}>{c.name}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      {here?.tagline && (
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 6 }}>{here.tagline}</Txt>
      )}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.inkFaint}
        style={s.title}
        maxLength={300}
        multiline
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Say more, if it needs it (optional)"
        placeholderTextColor={colors.inkFaint}
        style={s.body}
        multiline
      />

      {image ? (
        <View style={{ marginTop: space.md }}>
          <Image source={{ uri: image }} style={s.preview} resizeMode="cover" />
          <Pressable onPress={() => setImage(null)} style={s.remove} hitSlop={8}>
            <Feather name="x" size={15} color={colors.onPrimary} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pick} style={s.addImage}>
          <Feather name="image" size={16} color={colors.ink} />
          <Txt variant="button">Add a picture</Txt>
        </Pressable>
      )}

      <View style={{ marginTop: space.lg }}>
        <Note icon="shield">
          Phone numbers, emails and off-platform handles are removed automatically.
          Deals done here have an ID check, a record and a way to dispute; deals done
          on WhatsApp have none of those.
        </Note>
      </View>

      <View style={{ marginTop: space.md }}>
        <Note icon="info">
          Pictures picked here are not uploaded yet — that lands with the same S3 path
          the listing photos use. Until then a post keeps its title and text.
        </Note>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  rail: { marginHorizontal: -space.xl, paddingHorizontal: space.xl, marginTop: space.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: space.md, paddingVertical: 9, marginRight: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  dot: { width: 7, height: 7, borderRadius: 4 },
  title: {
    ...type.h2, color: colors.ink, marginTop: space.xl, paddingVertical: space.md,
    borderBottomWidth: 1.5, borderBottomColor: colors.fieldLine,
  },
  body: {
    ...type.body, color: colors.ink, minHeight: 110, marginTop: space.lg, padding: space.md,
    textAlignVertical: "top",
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  addImage: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm,
    height: 48, marginTop: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.lineStrong,
  },
  preview: { width: "100%", height: 200, borderRadius: radius.md, backgroundColor: colors.surfaceSunk },
  remove: {
    position: "absolute", top: space.sm, right: space.sm,
    width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(11,22,34,0.6)",
  },
});
