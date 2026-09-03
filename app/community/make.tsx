import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useToast } from "../../components/Toast";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { makeCommunity, toSlug } from "../../lib/community";
import { colors, radius, space, type } from "../../theme";

/** The colours a community can take.
 *
 *  A fixed set rather than a picker: every one of these reads on both the
 *  light chips and the dark selected state, which a free colour wheel cannot
 *  promise. The dot is the only branding a community gets, so it has to work
 *  everywhere it appears. */
const ACCENTS = ["#C8102E", "#1B4F9C", "#0B3D2E", "#A88D60", "#7A5AA8", "#0E7490", "#B45309", "#1F2937"];

export default function MakeCommunity() {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [busy, setBusy] = useState(false);

  // The address follows the name until it is edited by hand, then it stops —
  // otherwise a considered address gets overwritten by a typo in the title.
  const [slugTouched, setSlugTouched] = useState(false);
  const effectiveSlug = slugTouched ? slug : toSlug(name);

  const valid = /^[a-z0-9][a-z0-9_-]{2,20}$/.test(effectiveSlug) && name.trim().length >= 3;

  const submit = async () => {
    setBusy(true);
    const r = await makeCommunity({
      slug: effectiveSlug, name: name.trim(),
      tagline: tagline.trim() || undefined,
      description: description.trim() || undefined,
      accent,
    });
    setBusy(false);
    if (r.slug) router.replace({ pathname: "/community", params: { slug: r.slug } });
    else toast(r.message ?? "That community could not be made.", { tone: "bad" });
  };

  return (
    <Screen
      back
      footer={
        <>
          <Button label={busy ? "Creating" : "Create community"} onPress={submit}
            disabled={!valid} loading={busy} />
          {!valid && (
            <Txt variant="bodySmall" color={colors.inkFaint} center>
              {name.trim().length < 3 ? "Give it a name" : "The address needs 3–21 letters or digits"}
            </Txt>
          )}
                  </>
      }
    >
      <Txt variant="display" style={{ marginTop: space.sm }}>New Community</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        A place for one subject. Vintage WOTC, Japanese pulls, Brisbane meetups — the
        narrower it is, the more it gets used.
      </Txt>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>Name</Txt>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Vintage WOTC"
        placeholderTextColor={colors.inkFaint}
        style={s.name}
        maxLength={60}
      />

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>Address</Txt>
      <View style={s.slugBox}>
        <Txt variant="body" color={colors.inkFaint}>g/</Txt>
        <TextInput
          value={effectiveSlug}
          onChangeText={(t) => { setSlugTouched(true); setSlug(toSlug(t)); }}
          placeholder="vintagewotc"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={s.slugInput}
          maxLength={21}
        />
        {effectiveSlug.length > 0 && (
          <Feather
            name={valid ? "check-circle" : "alert-circle"}
            size={16}
            color={valid ? colors.up : colors.inkFaint}
          />
        )}
      </View>
      <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 5 }}>
        This is the permanent address. The name above can change later; this cannot.
      </Txt>

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
        One Line, Under The Name
      </Txt>
      <TextInput
        value={tagline}
        onChangeText={setTagline}
        placeholder="Base Set through Neo Destiny"
        placeholderTextColor={colors.inkFaint}
        style={s.field}
        maxLength={90}
      />

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
        What Belongs Here
      </Txt>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="What people should post, and what they shouldn't."
        placeholderTextColor={colors.inkFaint}
        multiline
        style={s.body}
        maxLength={600}
      />

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>Colour</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rail}>
        {ACCENTS.map((c) => (
          <Pressable key={c} onPress={() => setAccent(c)} style={[s.swatch, accent === c && s.swatchOn]}>
            <View style={[s.swatchDot, { backgroundColor: c }]} />
            {accent === c && <Feather name="check" size={13} color={colors.onPrimary} />}
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.preview}>
        <View style={[s.dot, { backgroundColor: accent }]} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{name.trim() || "Your community"}</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
            g/{effectiveSlug || "address"}{tagline.trim() ? ` · ${tagline.trim()}` : ""}
          </Txt>
        </View>
      </View>

      <View style={{ marginTop: space.lg }}>
        <Note icon="users">
          You will be its first member. Nobody moderates it but you for now — reporting
          and removal come with the admin tools.
        </Note>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  name: {
    ...type.h2, color: colors.ink, paddingVertical: space.md, marginTop: 4,
    borderBottomWidth: 1.5, borderBottomColor: colors.fieldLine,
  },
  slugBox: {
    flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4,
    height: 52, paddingHorizontal: space.md,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  slugInput: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  field: {
    ...type.body, color: colors.ink, height: 52, paddingHorizontal: space.md, marginTop: 4,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  body: {
    ...type.body, color: colors.ink, minHeight: 96, padding: space.md, marginTop: 4,
    textAlignVertical: "top",
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  rail: { marginHorizontal: -space.xl, paddingHorizontal: space.xl, marginTop: space.sm },
  swatch: {
    flexDirection: "row", alignItems: "center", gap: 5,
    height: 42, paddingHorizontal: space.md, marginRight: 6,
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  swatchOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  swatchDot: { width: 16, height: 16, borderRadius: 8 },
  preview: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    marginTop: space.xl, padding: space.lg,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  dot: { width: 34, height: 34, borderRadius: 17 },
});
