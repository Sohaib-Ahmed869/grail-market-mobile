import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Note } from "../components/Note";
import { Stars } from "../components/Stars";
import { GraderBadge } from "../components/GraderChips";
import { SkeletonList, SkeletonRow } from "../components/Skeleton";
import { leaveRating, pendingRatings, type PendingDeal } from "../lib/ratings";
import { useToast } from "../components/Toast";
import { colors, radius, space, type } from "../theme";

/** Deals waiting on a rating.
 *
 *  Both sides rate, and the screen says which side you were on — "how was
 *  the seller" and "how was the buyer" are different questions, and someone
 *  answering the wrong one produces a number nobody can use. */
export default function Rate() {
  const router = useRouter();
  const [deals, setDeals] = useState<PendingDeal[] | undefined>(undefined);
  const [open, setOpen] = useState<PendingDeal | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    let alive = true;
    pendingRatings().then((d) => { if (alive) setDeals(d); });
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  const submit = async () => {
    if (!open || stars < 1) return;
    setBusy(true);
    const r = await leaveRating(open.listing_id, stars, comment.trim() || undefined);
    setBusy(false);
    if (r.ratingId) {
      setOpen(null); setStars(0); setComment("");
      load();
      toast("Rating left. It shows on their profile now.");
    } else {
      toast(r.message ?? "That rating could not be left.", { tone: "bad" });
    }
  };

  if (open) {
    const theyWere = open.my_role === "seller" ? "buyer" : "seller";
    return (
      <Screen
        back
        footer={
          <>
            <Button label={busy ? "Sending" : "Leave rating"} onPress={submit}
              disabled={stars < 1} loading={busy} />
            <Button label="Not now" kind="ghost" onPress={() => setOpen(null)} />
                      </>
        }
      >
        <Txt variant="display" style={{ marginTop: space.sm }}>
          How was the {theyWere}?
        </Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
          {open.card_name}{open.set_name ? ` · ${open.set_name}` : ""}
        </Txt>

        <View style={s.starBox}>
          <Stars value={stars || null} size={34} onPick={setStars} />
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: space.md }}>
            {["", "Would not deal again", "Something went wrong", "Fine",
              "Good — would deal again", "Everything you'd want"][stars] ?? "Tap a star"}
          </Txt>
        </View>

        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder={open.my_role === "seller"
            ? "Did they pay promptly? Anything the next seller should know? (optional)"
            : "Was it as described? Packed well? Anything the next buyer should know? (optional)"}
          placeholderTextColor={colors.inkFaint}
          multiline
          style={s.comment}
          maxLength={600}
        />

        <View style={{ marginTop: space.lg }}>
          <Note icon="info">
            Ratings are public and permanent, and they only exist on deals that actually
            completed — which is what makes them worth reading.
          </Note>
        </View>

        {/* A one-star rating with no way to act on it is a dead end. This is
            where somebody has just decided the deal went wrong, so it is where
            the other route belongs. */}
        <Pressable
          onPress={() =>
            router.push({ pathname: "/dispute/new", params: { listingId: open.listing_id } })
          }
          style={s.raise}
        >
          <Feather name="alert-triangle" size={15} color={colors.down} />
          <Txt variant="button" color={colors.down}>Something went wrong — open a dispute</Txt>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen back>
      <Txt variant="display" style={{ marginTop: space.sm }}>Rate A Deal</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Both sides rate each other once the card has changed hands.
      </Txt>

      {deals === undefined ? (
        <View style={{ marginTop: space.xl }}>
          <SkeletonList count={2}>{() => <SkeletonRow />}</SkeletonList>
        </View>
      ) : deals.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}><Feather name="star" size={20} color={colors.inkFaint} /></View>
          <Txt variant="h3" center style={{ marginTop: space.md }}>Nothing To Rate</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: 4 }}>
            Completed deals appear here. A rating on anything else would be a claim about
            a trade that never happened.
          </Txt>
        </View>
      ) : (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {deals.map((d) => {
            const img = d.photos?.[0]?.url ?? d.image_url;
            return (
              <Pressable key={d.listing_id} onPress={() => setOpen(d)} style={s.row}>
                {img ? (
                  <Image source={{ uri: img }} style={s.thumb} resizeMode="cover" />
                ) : (
                  <View style={[s.thumb, s.thumbEmpty]}>
                    <Feather name="image" size={15} color={colors.inkFaint} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <GraderBadge grader={d.grader ?? "RAW"} grade={d.grade} />
                  <Txt variant="h3" numberOfLines={1}>{d.card_name}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint}>
                    You were the {d.my_role}
                  </Txt>
                </View>
                <Feather name="chevron-right" size={18} color={colors.inkFaint} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  starBox: {
    alignItems: "center", paddingVertical: space.xxl, marginTop: space.xl,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  comment: {
    ...type.body, color: colors.ink, minHeight: 110, padding: space.md, marginTop: space.lg,
    textAlignVertical: "top",
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  thumb: { width: 48, height: 66, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  raise: {
    marginTop: space.md, height: 48, flexDirection: "row", gap: space.sm,
    alignItems: "center", justifyContent: "center",
    borderRadius: radius.pill, backgroundColor: colors.downWash,
  },
  empty: { alignItems: "center", marginTop: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
});
