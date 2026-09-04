import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Txt } from "../../components/Text";
import { Avatar } from "../../components/Avatar";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { Stars } from "../../components/Stars";
import { Loader } from "../../components/Loader";
import { Note } from "../../components/Note";
import { GraderBadge } from "../../components/GraderChips";
import { num, sellerProfile, type Seller } from "../../lib/market";
import { colors, radius, space } from "../../theme";
import { aud } from "../../lib/fx";

const money = (v: string | number | null | undefined) => aud(num(v));

const since = (iso: string | null | undefined) => {
  if (!iso) return "recently";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "recently"
    : d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
};

/** The seller, as a buyer is entitled to see them.
 *
 *  Everything on this page is something that can be checked or that we
 *  ourselves checked: the ID verification, when they joined, how many cards
 *  they have live, how many have sold, and where they trade from. No rating
 *  yet, because nobody has been rated — an empty five stars is worse than no
 *  stars at all.
 *
 *  No contact details, ever. Verified means identifiable to us, not exposed
 *  to everyone. */
export default function SellerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [s0, setS0] = useState<Seller | null | undefined>(undefined);

  useEffect(() => { sellerProfile(String(id)).then(setS0); }, [id]);

  if (s0 === undefined) {
    return <Screen back><Loader fill label="Loading seller" /></Screen>;
  }
  if (s0 === null) {
    return (
      <Screen back>
        <View style={{ alignItems: "center", marginTop: space.xxxl }}>
          <Feather name="user-x" size={22} color={colors.inkFaint} />
          <Txt variant="h3" center style={{ marginTop: space.md }}>Seller Not Found</Txt>
        </View>
      </Screen>
    );
  }

  const initials = s0.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Screen back>
      <View style={s.head}>
        <Avatar name={s0.name} id={(s0 as any).avatar} size={60} />
        <View style={{ flex: 1 }}>
          <Txt variant="h1" numberOfLines={1}>{s0.name}</Txt>
          <Txt variant="bodySmall" color={colors.inkMuted}>
            Member since {since(s0.memberSince)}
          </Txt>
          <View style={{ marginTop: 3 }}>
            <Stars
              value={(s0 as any).reputation?.average ?? null}
              count={(s0 as any).reputation?.count}
            />
          </View>
          {s0.suburbs.length > 0 && (
            <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
              Trades from {s0.suburbs.join(" · ")}
            </Txt>
          )}
        </View>
      </View>

      {s0.verified ? (
        <View style={s.verified}>
          <VerifiedBadge kind="seller" height={38} />
          <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: space.md }}>
            Government ID checked, passed {since(s0.verifiedAt)}. Their legal name is on
            file with us — that is what this badge means, and it is the only thing it means.
          </Txt>
        </View>
      ) : (
        <View style={{ marginTop: space.lg }}>
          <Note tone="bad" icon="alert-triangle">
            This member has not passed an ID check. They cannot list cards, and you
            should not send them money.
          </Note>
        </View>
      )}

      <View style={s.stats}>
        <Stat n={s0.live} label={s0.live === 1 ? "card for sale" : "cards for sale"} />
        <View style={s.divider} />
        <Stat n={s0.sold} label={s0.sold === 1 ? "card sold here" : "cards sold here"} />
      </View>

      {(s0 as any).metrics?.completionRate != null && (
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
          {Math.round((s0 as any).metrics.completionRate * 100)}% of their listings ended in a sale
          {(s0 as any).metrics.medianReplyHours != null
            ? ` · usually answers offers in ${
                (s0 as any).metrics.medianReplyHours < 1
                  ? "under an hour"
                  : `${Math.round((s0 as any).metrics.medianReplyHours)} hours`}`
            : ""}
        </Txt>
      )}

      {((s0 as any).reputation?.recent ?? []).length > 0 && (
        <>
          <Txt variant="h2" style={{ marginTop: space.xxl }}>What People Said</Txt>
          <View style={{ gap: space.md, marginTop: space.md }}>
            {((s0 as any).reputation.recent as any[]).map((r, i) => (
              <View key={i} style={s.review}>
                <View style={s.reviewHead}>
                  <Stars value={r.stars} size={13} />
                  <Txt variant="bodySmall" color={colors.inkFaint}>
                    {r.raterName ?? "member"} · as a {r.raterRole === "buyer" ? "buyer" : "seller"}
                  </Txt>
                </View>
                {r.comment && (
                  <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
                    {r.comment}
                  </Txt>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {s0.sold === 0 && (
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.sm }}>
          Nothing sold through us yet. That is not a warning — the market is new — but
          it does mean there is no trading history to judge them on.
        </Txt>
      )}

      <Txt variant="h2" style={{ marginTop: space.xxl }}>
        {s0.live > 0 ? `${s0.live} card${s0.live === 1 ? "" : "s"} for sale` : "Nothing for sale"}
      </Txt>

      <View style={{ gap: space.md, marginTop: space.md }}>
        {s0.listings.map((l) => {
          const img = l.photos?.[0]?.url ?? l.image_url;
          const market = num(l.market_value);
          const asking = num(l.price) ?? 0;
          const under = market != null && asking < market;
          return (
            <Pressable
              key={l.listing_id}
              onPress={() => router.push(`/listing/${l.listing_id}` as any)}
              style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceSunk }]}
            >
              {img ? (
                <Image source={{ uri: img }} style={s.thumb} resizeMode="cover" />
              ) : (
                <View style={[s.thumb, s.thumbEmpty]}>
                  <Feather name="image" size={15} color={colors.inkFaint} />
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <GraderBadge grader={l.grader ?? "RAW"} grade={l.grade} />
                <Txt variant="h3" numberOfLines={1}>{l.card_name}</Txt>
                <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                  {l.set_name ?? ""}
                </Txt>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Txt variant="h3">{money(l.price)}</Txt>
                {market != null && (
                  <Txt variant="bodySmall" color={under ? colors.up : colors.inkFaint}>
                    {under ? "under" : "over"} market
                  </Txt>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: space.xl }}>
        <Note icon="info">
          We don&rsquo;t hold anyone&rsquo;s money. Meet in a public place, or use tracked
          and insured post — and keep the conversation here until you have.
        </Note>
      </View>
    </Screen>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Txt variant="h1">{n}</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} center>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.lg, marginTop: space.sm },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center",
  },
  verified: {
    marginTop: space.xl, padding: space.lg,
    borderRadius: radius.lg, backgroundColor: colors.accentWash,
    borderWidth: 1, borderColor: colors.accentLine,
  },
  stats: {
    flexDirection: "row", alignItems: "center", marginTop: space.lg,
    paddingVertical: space.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  divider: { width: 1, height: 34, backgroundColor: colors.line },
  review: {
    padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  thumb: { width: 48, height: 66, borderRadius: 5, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
});
