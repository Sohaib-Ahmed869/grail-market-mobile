import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Note } from "../../components/Note";
import { useToast } from "../../components/Toast";
import { reasons as loadReasons, raise, type Reason } from "../../lib/disputes";
import { getListing, num, type Listing } from "../../lib/market";
import { useSession } from "../../lib/session";
import { colors, radius, space, type } from "../../theme";

const MAX_PHOTOS = 6;

/** Open a dispute.
 *
 *  The reason list comes from the server rather than being written here, so
 *  the app and the rules cannot drift apart on codes — a code the app invents
 *  is refused, and the person is told to "pick a reason from the list" they
 *  just picked from.
 *
 *  Photographs are optional but asked for early, because a dispute with a
 *  picture of the corner in question settles in one round and one without
 *  turns into three messages asking for one. */
export default function NewDispute() {
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [all, setAll] = useState<Reason[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadReasons().then(setAll);
    if (listingId) getListing(String(listingId)).then(setListing);
  }, [listingId]);

  // Which side of the deal this person is on decides which reasons make sense.
  // Showing a buyer "the buyer never paid" is offering them a complaint they
  // cannot have.
  const iAmSeller = Boolean(session && listing && listing.seller_id === session.userId);
  const mine = all.filter((r) => r.side === "both" || r.side === (iAmSeller ? "seller" : "buyer"));

  const add = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast("Photo access is off. Turn it on in Settings to add evidence.", { tone: "bad" });
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.9,
      allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (r.canceled) return;
    setPhotos((p) => [...p, ...r.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  };

  const submit = async () => {
    if (!reason || !listingId) return;
    setBusy(true);
    const r = await raise({
      listingId: String(listingId), reason, detail, photos,
    });
    setBusy(false);
    if (!r.ok) { toast(r.message, { tone: "bad" }); return; }
    if (r.photosFailed > 0) {
      toast(
        `Dispute opened, but ${r.photosFailed} photo${r.photosFailed === 1 ? "" : "s"} didn't upload. Add them again below.`,
        { tone: "bad" },
      );
    } else {
      toast("Dispute opened. The other side has been told.", { tone: "good" });
    }
    router.replace({ pathname: "/dispute/[id]", params: { id: r.disputeId } });
  };

  return (
    <Screen
      back
      footer={
        <Button
          label="Open the dispute"
          onPress={submit}
          loading={busy}
          disabled={!reason || !listingId}
        />
      }
    >
      <Txt variant="display">Something Went Wrong</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Tell us what happened. The other side sees this and gets a chance to answer
        before anyone decides anything.
      </Txt>

      {listing && (
        <View style={s.card}>
          {listing.image_url ? (
            <Image source={{ uri: listing.image_url }} style={s.art} />
          ) : (
            <View style={[s.art, s.artEmpty]}>
              <Icon name="card" size={18} color={colors.inkFaint} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Txt variant="h3" numberOfLines={2}>{listing.card_name}</Txt>
            <Txt variant="bodySmall" color={colors.inkMuted}>
              {listing.set_name ?? "—"}
              {listing.grader ? ` · ${listing.grader} ${listing.grade}` : ""}
            </Txt>
            <Txt variant="bodySmall" color={colors.ink} style={{ fontWeight: "600" }}>
              A${num(listing.price)?.toLocaleString("en-AU")}
            </Txt>
          </View>
        </View>
      )}

      <Txt variant="h3" style={{ marginTop: space.xl }}>What Happened?</Txt>
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {mine.map((r) => (
          <Pressable
            key={r.code}
            onPress={() => setReason(r.code)}
            style={[s.reason, reason === r.code && s.reasonOn]}
          >
            <View style={[s.radio, reason === r.code && s.radioOn]}>
              {reason === r.code && <View style={s.dot} />}
            </View>
            <Txt variant="body" color={reason === r.code ? colors.ink : colors.inkMuted}>
              {r.label}
            </Txt>
          </Pressable>
        ))}
      </View>

      <Txt variant="h3" style={{ marginTop: space.xl }}>In Your Words</Txt>
      <TextInput
        value={detail}
        onChangeText={setDetail}
        multiline
        placeholder="What arrived, what you expected, and what you've already tried."
        placeholderTextColor={colors.inkFaint}
        style={s.detail}
        maxLength={2000}
      />

      <View style={s.photosHead}>
        <Txt variant="h3">Evidence</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint}>{photos.length}/{MAX_PHOTOS}</Txt>
      </View>
      <Txt variant="bodySmall" color={colors.inkMuted}>
        Photographs settle this faster than anything you can write. The card, the slab
        label, the packaging it came in.
      </Txt>
      <View style={s.photos}>
        {photos.map((uri, i) => (
          <View key={uri + i} style={s.thumbWrap}>
            <Image source={{ uri }} style={s.thumb} />
            <Pressable
              onPress={() => setPhotos((p) => p.filter((_, n) => n !== i))}
              hitSlop={8}
              style={s.remove}
            >
              <Txt variant="bodySmall" color={colors.onPrimary}>×</Txt>
            </Pressable>
          </View>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Pressable onPress={add} style={[s.thumb, s.addTile]}>
            <Icon name="photo" size={20} color={colors.inkMuted} />
            <Txt variant="bodySmall" color={colors.inkMuted}>Add</Txt>
          </Pressable>
        )}
      </View>

      <Note tone="info" icon="shield">
        Keep it here rather than moving to a phone or an email. A dispute settled off
        the platform is one nobody can help you with.
      </Note>
    </Screen>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row", gap: space.md, marginTop: space.lg, padding: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  art: { width: 54, height: 76, borderRadius: radius.sm, backgroundColor: colors.surfaceSunk },
  artEmpty: { alignItems: "center", justifyContent: "center" },
  reason: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.line,
  },
  // Selection is colour, never border width — changing the width moves the
  // row's edge and the whole list nudges as you tap down it.
  reasonOn: { borderColor: colors.ink, backgroundColor: colors.accentWash },
  radio: {
    width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: colors.fieldLine,
  },
  radioOn: { borderColor: colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  detail: {
    marginTop: space.sm, minHeight: 110, padding: space.md, textAlignVertical: "top",
    ...type.body, color: colors.ink,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.surface,
  },
  photosHead: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    marginTop: space.xl,
  },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
  thumbWrap: { position: "relative" },
  thumb: {
    width: 82, height: 82, borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
  addTile: {
    alignItems: "center", justifyContent: "center", gap: 2,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.fieldLine,
  },
  remove: {
    position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", backgroundColor: colors.ink,
  },
});
