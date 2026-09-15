import { Image, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Txt } from "./Text";
import { Bone } from "./Skeleton";
import { lens, lh } from "./MarketLens";
import { aud } from "../lib/fx";
import { isLoadable } from "../lib/art";
import { num, type Listing } from "../lib/market";
import type { PlaceState } from "../lib/location";
import { fonts } from "../theme";

/** How far a nearby search reaches. Past this it is not "around the corner". */
export const NEARBY_KM = 50;

/** Cards for sale, by how far away they are.
 *
 *  The meet-up is the transaction here — no escrow, no platform payment — so
 *  distance is the first thing a buyer weighs and it leads each row. Without a
 *  location the panel says so and offers to fix it, rather than calling the
 *  newest listings "nearby" when they may be a state away.
 */
export function LocalExchange({
  place, listings, onAskLocation,
}: {
  place: PlaceState;
  /** Nearest first when the place is known; the newest otherwise. */
  listings: Listing[] | undefined;
  onAskLocation: () => void;
}) {
  const router = useRouter();
  const located = place.status === "ready";

  return (
    <View style={s.shell}>
      <LinearGradient
        colors={["#F2F4F3", "#E4ECE9", "#DAE5E2"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.titleRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt style={s.overline}>THE LOCAL EXCHANGE</Txt>
          <Txt style={s.title} numberOfLines={1}>Fresh finds nearby</Txt>
        </View>
        <Pressable onPress={() => router.push("/market")} style={({ pressed }) => [s.outline, pressed && { opacity: 0.7 }]}>
          <Txt style={s.outlineText}>See all</Txt>
        </Pressable>
      </View>
      <Txt style={s.sub} numberOfLines={1}>
        {located && place.place.label
          ? `Good cards. Collectors around ${place.place.label}.`
          : "Good cards. Collectors around the corner."}
      </Txt>

      {!located && place.status !== "loading" && (
        <View style={s.ask}>
          <View style={s.askIcon}><Feather name="map-pin" size={15} color={lens.goldText} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={s.askTitle}>See how far each card is</Txt>
            <Txt style={s.askBody}>
              {place.status === "unavailable"
                ? "This build can't read location yet."
                : place.status === "denied" && !place.canAskAgain
                  ? "Location is off for GrailMarket."
                  : "Used to measure distance. Not stored."}
            </Txt>
          </View>
          {place.status !== "unavailable" && (
            <Pressable onPress={onAskLocation} style={({ pressed }) => [s.askBtn, pressed && { opacity: 0.85 }]}>
              <Txt style={s.askBtnText}>
                {place.status === "denied" && !place.canAskAgain ? "Settings" : "Use location"}
              </Txt>
            </Pressable>
          )}
        </View>
      )}

      <View style={s.rule} />

      {listings === undefined ? (
        [0, 1].map((i) => (
          <View key={i} style={[s.row, i > 0 && s.rowRule]}>
            <Bone w={46} h={64} r={4} />
            <View style={{ flex: 1, gap: 6 }}>
              <Bone w="60%" h={14} />
              <Bone w="80%" h={11} />
            </View>
          </View>
        ))
      ) : listings.length === 0 ? (
        <Txt style={[s.sub, { paddingVertical: 14 }]}>
          {located ? `Nothing listed within ${NEARBY_KM} km yet.` : "Nothing listed yet."}
        </Txt>
      ) : (
        listings.map((l, i) => {
          // The seller's own photo first: the API signs it, so it loads. A bare
          // `image_url` into the listings bucket is unsigned and refused.
          const art = [l.photos?.[0]?.url, l.image_url].find((u) => isLoadable(u)) ?? null;
          const pickup = (l.delivery ?? []).includes("pickup");
          return (
            <Pressable
              key={l.listing_id}
              onPress={() => router.push(`/listing/${l.listing_id}` as any)}
              style={({ pressed }) => [s.row, i > 0 && s.rowRule, pressed && { opacity: 0.8 }]}
            >
              <View style={[s.thumb, art && s.thumbArt]}>
                {art ? <Image source={{ uri: art }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={s.name} numberOfLines={2}>{l.card_name}</Txt>
                <Txt style={s.where} numberOfLines={1}>{whereLine(l, located)}</Txt>
                {pickup && (
                  <View style={s.meet}><Txt style={s.meetText}>Meet in person</Txt></View>
                )}
              </View>
              <Txt style={s.price}>{aud(num(l.price)).replace(/^A\$/, "$")}</Txt>
            </Pressable>
          );
        })
      )}

      <View style={[s.rule, { marginTop: 2 }]} />
      <View style={s.footRow}>
        <Feather name="map-pin" size={13} color={lens.inkSoft} />
        <Txt style={s.foot}>Meet locally. Inspect the card. Agree directly.</Txt>
      </View>
    </View>
  );
}

/** "PSA 10 · Surry Hills, 2 km". The grade the seller declared, or Raw — the
 *  free-text condition note is the seller's words and too long for a row. A
 *  distance only when we measured one; a suburb we could not place is shown
 *  as the suburb alone rather than as "0 km". */
function whereLine(l: Listing, located: boolean): string {
  const grade = l.grader ? [l.grader, l.grade].filter(Boolean).join(" ") : "Raw";
  const km = l.distance_km;
  const place = l.suburb
    ? located && km != null
      ? `${l.suburb}, ${km === 0 ? "under 1 km" : `${km} km`}`
      : l.suburb
    : null;
  return [grade, place].filter(Boolean).join(" · ");
}

const s = StyleSheet.create({
  shell: {
    borderRadius: 24, overflow: "hidden", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.95)", backgroundColor: "#E8EEEC",
    shadowColor: "#0B1622", shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  overline: { fontFamily: fonts.semi, fontSize: 11, lineHeight: lh(11), letterSpacing: 1.5, color: lens.inkSoft },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { fontFamily: fonts.semi, fontSize: 21, lineHeight: lh(21), letterSpacing: -0.4, color: lens.ink, marginTop: 2 },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: lh(13), color: lens.inkSoft, marginTop: 4 },
  outline: {
    height: 38, paddingHorizontal: 13, borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: lens.outline, backgroundColor: "rgba(255,255,255,0.35)",
  },
  outlineText: { fontFamily: fonts.semi, fontSize: 13, lineHeight: lh(13), color: lens.goldText },
  rule: { height: 1, backgroundColor: lens.hairline, marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  rowRule: { borderTopWidth: 1, borderTopColor: lens.hairline },
  thumb: {
    width: 46, height: 64, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(28,39,51,0.07)",
    transform: [{ rotate: "-3deg" }],
  },
  thumbArt: {
    backgroundColor: "#D5DCDA",
    shadowColor: "#0B1622", shadowOpacity: 0.28, shadowRadius: 6, shadowOffset: { width: 0, height: 4 },
  },
  name: { fontFamily: fonts.semi, fontSize: 15, lineHeight: lh(15), color: lens.ink },
  where: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft, marginTop: 1 },
  meet: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#F7EFDD" },
  meetText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: lh(11), color: "#6F5A36" },
  price: { fontFamily: fonts.semi, fontSize: 16, lineHeight: lh(16), color: lens.ink, fontVariant: ["tabular-nums"] },
  footRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10 },
  foot: { fontFamily: fonts.regular, fontSize: 11, lineHeight: lh(11), color: lens.inkSoft },
  ask: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 10, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  askIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#F7EFDD" },
  askTitle: { fontFamily: fonts.semi, fontSize: 13, lineHeight: lh(13), color: lens.ink },
  askBody: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: lh(11.5), color: lens.inkSoft },
  askBtn: { height: 32, paddingHorizontal: 11, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: lens.ink },
  askBtnText: { fontFamily: fonts.semi, fontSize: 12, lineHeight: lh(12), color: "#FFFFFF" },
});
