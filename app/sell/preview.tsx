import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { SellSteps } from "../../components/SellSteps";
import { GraderBadge } from "../../components/GraderChips";
import { gradeLabel, variantLabel } from "../../lib/grading";
import { getDraft } from "../../lib/selldraft";
import { useSession } from "../../lib/session";
import { colors, radius, space } from "../../theme";
import { aud } from "../../lib/fx";

const money = (n?: number | null) => aud(n);

/** Step 4 — exactly what a buyer will see.
 *
 *  Not a summary of the form. The same layout, badges and wording the listing
 *  page uses, because the thing a seller wants to check is how it will look to
 *  someone else — and a tidy recap of their own inputs answers a different
 *  question. */
export default function SellPreview() {
  const router = useRouter();
  const d = getDraft();
  const session = useSession();
  /* Arriving here with nothing to show.
   *
   * A mount-time question — "did you reach this screen without a draft?" —
   * and it has to stay one. Written as a live check on the draft, it also
   * fired when the draft was cleared ON PURPOSE: submitting replaces this
   * route with the confirmation, every screen still on the sell stack
   * re-renders as the navigator changes, this one read a draft that had just
   * been cleared by a SUCCESSFUL submit, and sent the seller back to
   * `/sell/card`. The listing was created and in review, and the app looked
   * like it had thrown the form away and reopened it — so the same card
   * could be filled in and submitted over and over.
   *
   * Read once, on the first render, before any of that can happen.
   *
   * It also called router.replace() during RENDER, which updates the
   * navigation container while React is drawing this component. Rendering
   * has to be free of side effects; the redirect belongs in an effect.
   *
   * Still returns null immediately, so the empty screen never flashes. */
  const [arrivedWithDraft] = useState(() => Boolean(getDraft()));
  useEffect(() => {
    if (!arrivedWithDraft) router.replace("/sell/card");
  }, [arrivedWithDraft, router]);
  // Two different conditions, kept apart on purpose. The one above decides
  // whether to NAVIGATE and is answered once, at mount. This one only decides
  // whether there is anything to DRAW, and is answered live — because a
  // successful submit clears the draft while this screen is still on the
  // stack, and reading `.photos` off a null is how that would crash instead.
  if (!d) return null;

  const photos = d.photos ?? [];
  const verified = photos.length >= 10;
  const market = d.marketValue ?? null;
  const price = d.price ?? 0;
  const delta = market ? Math.round(((price - market) / market) * 100) : null;

  return (
    <Screen back footer={<Button label="Next · Declaration" onPress={() => router.push("/sell/declare")} />}>
      <SellSteps step={4} />
      <Txt variant="display" style={{ marginTop: space.lg }}>How It Will Look</Txt>

      <View style={s.preview}>
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.gallery}>
            {photos.map((p) => (
              <Image key={p.angle} source={{ uri: p.url }} style={s.shot} resizeMode="cover" />
            ))}
          </ScrollView>
        )}

        <View style={s.body}>
          <View style={s.badges}>
            {verified && (
              <View style={[s.badge, s.badgeVerified]}>
                <Feather name="camera" size={10} color={colors.up} />
                <Txt variant="overline" color={colors.up} style={s.badgeTxt}>Photo verified</Txt>
              </View>
            )}
            <GraderBadge grader={d.isRaw ? "RAW" : d.grader} grade={d.grade} />
            {d.variant && d.variant !== "normal" && (
              <View style={[s.badge, s.badgeRaw]}>
                <Txt variant="overline" color={colors.inkMuted} style={s.badgeTxt}>
                  {variantLabel(d.variant)}
                </Txt>
              </View>
            )}
          </View>

          <Txt variant="h1" style={{ marginTop: space.sm }}>{d.cardName}</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted}>
            {[d.setName, d.cardNumber && `#${d.cardNumber}`].filter(Boolean).join(" · ")}
          </Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {d.isRaw
              ? `Raw · ${gradeLabel("RAW", d.grade)}`
              : `${d.grader ?? ""} ${gradeLabel(d.grader, d.grade)}`.trim()}
          </Txt>

          <Txt variant="price" style={{ marginTop: space.md }}>{money(price)}</Txt>
          {delta != null && (
            <Txt variant="bodySmall" color={colors.inkMuted}>
              {delta === 0 ? "At market" : `${Math.abs(delta)}% ${delta > 0 ? "above" : "below"} market`}
              {" · "}{money(market)} market value
            </Txt>
          )}

          {d.conditionNote && (
            <View style={s.sellerNote}>
              <Txt variant="overline" color={colors.inkFaint}>From The Seller</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
                {d.conditionNote}
              </Txt>
            </View>
          )}

          <View style={s.seller}>
            <View style={s.avatar}>
              <Txt variant="overline" color={colors.onPrimary}>
                {(session?.name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{session?.name ?? "You"}</Txt>
              <Txt variant="bodySmall" color={colors.inkMuted}>
                {d.suburb ?? "Location not set"} · new member
              </Txt>
            </View>
            <View style={s.sellerVerified}>
              <Feather name="shield" size={11} color={colors.accent} />
              <Txt variant="overline" color={colors.accent} style={s.badgeTxt}>Seller verified</Txt>
            </View>
          </View>

          <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.lg }}>
            Getting It To You
          </Txt>
          {(d.delivery ?? []).map((x) => (
            <View key={x} style={s.deliveryRow}>
              <Feather name={x === "pickup" ? "map-pin" : "truck"} size={14} color={colors.inkMuted} />
              <Txt variant="bodySmall" color={colors.inkMuted}>
                {x === "pickup" ? `Pickup — around ${d.suburb ?? "your suburb"}`
                  : x === "insured" ? "Post — tracked and insured" : "Post — tracked"}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      {!verified && (
        <View style={{ marginTop: space.lg }}>
          <Note tone="accent" icon="alert-triangle">
            Without all ten angles this listing has no Photo Verified mark, and buyers
            filtering for it will not see it.
          </Note>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: {
    marginTop: space.lg, borderRadius: radius.lg, overflow: "hidden",
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  gallery: { backgroundColor: colors.surfaceSunk },
  shot: { width: 128, height: 176 },
  body: { padding: space.lg },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  badgeTxt: { fontSize: 11.5, letterSpacing: 0.1 },
  badgeVerified: { backgroundColor: colors.upWash },
  badgeGrade: { backgroundColor: colors.ink },
  badgeRaw: { backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line },
  sellerNote: {
    marginTop: space.md, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
  },
  seller: {
    flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg,
    paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.line,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center",
  },
  sellerVerified: { flexDirection: "row", alignItems: "center", gap: 4 },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 6 },
});
