import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { Loader } from "./Loader";
import { meetupShops, type MeetupAnswer } from "../lib/meetups";
import { colors, radius, shadow, space, type } from "../theme";

/** Where to hand the card over.
 *
 *  There is no escrow, no shipping and no platform payment, so the meet-up is
 *  the transaction and where it happens is the main physical safety control
 *  the product offers. This suggests card shops between the two people — a
 *  public place with staff and cameras — without insisting: meeting at either
 *  home is the parties' choice, and the copy says so.
 *
 *  The buyer types their suburb; the seller's side comes from the listing.
 *  Neither is shown to the other person here — only the shops and how far
 *  each is from "you". */
export function MeetupShops({ dealId, role }: { dealId: string; role: "buyer" | "seller" }) {
  const [near, setNear] = useState("");
  const [answer, setAnswer] = useState<MeetupAnswer | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const look = async (place?: string, attempt = 0) => {
    const mine = ++seq.current;
    if (attempt === 0) setBusy(true);
    const r = await meetupShops(dealId, place);
    if (mine !== seq.current) return;
    // The first lookup for a new part of the country fetches its shops in
    // the background. Asking again by ourselves, a few times, beats telling
    // somebody standing in the handover step to go and pull to refresh.
    if (r?.retry && attempt < 3) {
      setAnswer({ ...r, note: "Finding card shops around you…" });
      setBusy(false);
      retryTimer.current = setTimeout(() => look(place, attempt + 1), 15_000);
      return;
    }
    setAnswer(r);
    setBusy(false);
  };
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current); }, []);

  // The seller's own suburb is already on the listing, so their list can load
  // straight away. The buyer's needs a suburb first.
  useEffect(() => { if (role === "seller") void look(); }, [dealId, role]);

  const mineKm = (s: MeetupAnswer["shops"][number]) => (role === "buyer" ? s.fromBuyerKm : s.fromSellerKm);
  const theirsKm = (s: MeetupAnswer["shops"][number]) => (role === "buyer" ? s.fromSellerKm : s.fromBuyerKm);

  return (
    <View style={s.wrap}>
      <Txt variant="h2">Where to meet</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 2 }}>
        A card shop between you is a public place with staff around. Meeting
        anywhere else is up to the two of you.
      </Txt>

      {role === "buyer" && (
        <View style={s.field}>
          <Feather name="map-pin" size={16} color={colors.inkFaint} />
          <TextInput
            value={near}
            onChangeText={setNear}
            onSubmitEditing={() => look(near)}
            placeholder="Your suburb or postcode"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="search"
            autoCorrect={false}
            style={s.input}
          />
          <Pressable onPress={() => look(near)} disabled={busy || near.trim().length < 3} hitSlop={8}
            style={({ pressed }) => [s.go, (busy || near.trim().length < 3) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            accessibilityLabel="Find card shops">
            <Feather name="arrow-right" size={16} color={colors.onPrimary} />
          </Pressable>
        </View>
      )}

      {busy ? (
        <View style={{ paddingVertical: space.lg }}><Loader /></View>
      ) : answer === null ? (
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.md }}>
          Couldn't look up shops just now. Try again in a minute.
        </Txt>
      ) : answer ? (
        <>
          {answer.note ? (
            <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: space.md }}>{answer.note}</Txt>
          ) : null}
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {answer.shops.map((shop) => (
              <Pressable key={`${shop.name}:${shop.lat}`} onPress={() => Linking.openURL(shop.mapsUrl)}
                style={({ pressed }) => [s.shop, pressed && { transform: [{ scale: 0.99 }] }]}
                accessibilityRole="link" accessibilityLabel={`Open ${shop.name} in Maps`}>
                <View style={[s.badge, shop.kind === "card" && s.badgeCard]}>
                  <Feather name={shop.kind === "card" ? "layers" : "grid"} size={15}
                    color={shop.kind === "card" ? colors.onPrimary : colors.ink} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="h3" numberOfLines={1}>{shop.name}</Txt>
                  <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                    {[
                      shop.address,
                      mineKm(shop) != null ? `${mineKm(shop)} km from you` : null,
                      theirsKm(shop) != null ? `${theirsKm(shop)} km from them` : null,
                    ].filter(Boolean).join(" · ") || (shop.kind === "card" ? "Card shop" : "Game shop")}
                  </Txt>
                </View>
                <Feather name="navigation" size={16} color={colors.inkMuted} />
              </Pressable>
            ))}
          </View>
          {answer.shops.length > 0 && answer.attribution ? (
            <Txt style={s.attr}>{answer.attribution}</Txt>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: space.xl },
  field: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 48, marginTop: space.md, paddingLeft: space.md, paddingRight: 6,
    borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card,
  },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  go: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  shop: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card,
  },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.field },
  badgeCard: { backgroundColor: colors.ink },
  attr: { ...type.overline, fontSize: 11, color: colors.inkFaint, marginTop: space.sm },
});
