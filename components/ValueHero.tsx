import { Image, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Bloom } from "./Bloom";
import { Mark } from "./Brand";
import { Txt } from "./Text";
import { Bone } from "./Skeleton";
import { colors, radius, shadow, space, type } from "../theme";

export type HeroStat = { n: string; label: string };

/** What the collection is worth.
 *
 *  A light card on the dark band, not a dark rectangle in it. The number sits
 *  on a soft aurora of the brand's own two colours — navy and gold, tinted
 *  down to a wash and pooled at opposite corners — with the G in the corner
 *  where a wallet puts its address. The cards held are a row of small round
 *  portraits, the way a wallet shows its assets, and the change since you
 *  paid is a pill beside them. Two actions underneath, each in its own pill.
 *
 *  Everything it says is derived from what it is given. A wallet card whose
 *  ground is a gradient and a number is honest; one whose ground is a stock
 *  photo is decoration.
 */
export function ValueHero({
  value, delta, art, stats, loading, empty, unpriced, onScan, onPress, bare,
}: {
  value: string;
  /** Cards are held but none of them has a price yet. The number is then a
   *  dash, not A$0.00 — zero says the collection is worthless, which is a
   *  claim, and the truth is only that we have not priced it. */
  unpriced?: boolean;
  /** Signed, already formatted. Null when there is no cost basis to compare. */
  delta?: { text: string; up: boolean } | null;
  /** Artwork from the collection, best first. The first three become the
   *  portraits along the bottom. */
  art?: (string | null | undefined)[];
  /** Kept for the callers that pass it. The line along the bottom edge is
   *  gone: on a light card it competed with the number, and the number is
   *  the only thing anybody opens this for. */
  spark?: number[];
  /** Composed into the line under the title — "3 cards held · 1 priced". */
  stats: HeroStat[];
  loading?: boolean;
  empty?: boolean;
  onScan?: () => void;
  onPress?: () => void;
  /** On the dark band. Only changes how far the card stands off its edges. */
  bare?: boolean;
}) {
  // Only pictures another device can fetch. A collection row keeps whatever
  // the phone that added it wrote — for a scanned card that is its own
  // ImagePicker path under file:///var/mobile, a real address on one handset
  // and a blank disc on every other. A portrait we cannot draw is left out
  // rather than drawn empty.
  const loadable = (art ?? []).filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u));
  const faces = loadable.slice(0, 3);
  const more = Math.max(0, loadable.length - faces.length);
  const subtitle = stats
    .filter((st) => st.n !== "0" || st.label.startsWith("card"))
    .map((st) => `${st.n} ${st.label}`)
    .join(" · ");

  return (
    <View style={[s.outer, bare && s.outerBare]}>
      {/* ---- the panel ---------------------------------------------------- */}
      <Pressable onPress={onPress} disabled={!onPress} style={s.panel}>
        {/* Navy pooled top-left, gold bottom-right, both tinted to a wash.
            Two blooms and one diagonal veil is the whole aurora — the same
            two colours as the rest of the app, nowhere a third. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={s.bloomNavy}><Bloom size={420} color={colors.dark} opacity={0.20} /></View>
          <View style={s.bloomGold}><Bloom size={380} color={colors.accent} opacity={0.30} /></View>
          <LinearGradient
            colors={["rgba(26,38,50,0.10)", "rgba(255,255,255,0)", "rgba(184,128,31,0.12)"]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={s.top}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="overline" color={colors.inkFaint}>Collection value</Txt>
            {loading ? (
              <Bone w="46%" h={12} style={{ marginTop: 6 }} />
            ) : (
              <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1} style={{ marginTop: 2 }}>
                {empty ? "Nothing held yet" : unpriced ? `${subtitle} · none priced yet` : subtitle}
              </Txt>
            )}
          </View>
          {/* The mark, in the corner a wallet keeps its address icon. */}
          <View style={s.markBox}><Mark size={22} /></View>
        </View>

        {loading ? (
          <Bone w="58%" h={38} style={{ marginTop: space.lg, marginBottom: space.lg }} />
        ) : (
          <Txt style={s.value} numberOfLines={1} adjustsFontSizeToFit>
            {empty || unpriced ? "—" : value}
          </Txt>
        )}

        <View style={s.bottom}>
          {/* What is held, as portraits. Three at most, overlapping, and a
              count for the rest — or a plus that starts the collection. */}
          <View style={s.faces}>
            {faces.map((uri, i) => (
              <View key={uri + i} style={[s.face, i > 0 && { marginLeft: -10 }]}>
                <Image source={{ uri }} style={s.faceImg} resizeMode="cover" />
              </View>
            ))}
            <Pressable
              onPress={onScan}
              disabled={!onScan}
              style={[s.face, s.faceMore, faces.length > 0 && { marginLeft: -10 }]}
              accessibilityLabel={more > 0 ? `${more} more cards` : "Scan a card"}
            >
              {more > 0 ? (
                <Txt variant="overline" color={colors.ink}>+{more}</Txt>
              ) : (
                <Feather name="plus" size={15} color={colors.ink} />
              )}
            </Pressable>
          </View>

          {delta && !empty && !unpriced && !loading ? (
            <View style={[s.delta, { backgroundColor: delta.up ? colors.upWash : colors.downWash }]}>
              <Txt style={[s.deltaTxt, { color: delta.up ? colors.up : colors.down }]}>{delta.text}</Txt>
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* ---- the two things you can do ------------------------------------ */}
      <View style={s.actions}>
        <Action icon="camera" label="Scan" onPress={onScan} primary={Boolean(empty)} />
        <Action icon="layers" label="Collection" onPress={onPress} />
      </View>
    </View>
  );
}

function Action({
  icon, label, onPress, primary,
}: { icon: keyof typeof Feather.glyphMap; label: string; onPress?: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.action, primary && s.actionPrimary, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.actionIcon, primary && s.actionIconPrimary]}>
        <Feather name={icon} size={17} color={primary ? colors.onPrimary : colors.dark} />
      </View>
      <Txt variant="button" color={colors.ink}>{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  // The thick white rim the reference has: the card is a card on a card.
  outer: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    padding: 8,
    ...shadow.lifted,
  },
  outerBare: { marginHorizontal: space.lg },

  panel: {
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "#F3F5F9",
    padding: space.lg,
    paddingTop: space.md,
  },
  bloomNavy: { position: "absolute", top: -230, left: -190 },
  bloomGold: { position: "absolute", bottom: -220, right: -170 },

  top: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  markBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1, borderColor: "rgba(26,38,50,0.10)",
  },

  value: {
    ...type.display,
    fontSize: 44, lineHeight: 50, letterSpacing: -1.4,
    color: colors.ink,
    marginTop: space.md, marginBottom: space.lg,
    fontVariant: ["tabular-nums"],
  },

  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  faces: { flexDirection: "row", alignItems: "center" },
  face: {
    width: 36, height: 36, borderRadius: 18, overflow: "hidden",
    borderWidth: 2, borderColor: colors.surface,
    backgroundColor: colors.surfaceSunk,
  },
  faceImg: { width: "100%", height: "100%" },
  faceMore: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  delta: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  deltaTxt: { ...type.button, fontVariant: ["tabular-nums"] },

  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  action: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 54, paddingLeft: 6, paddingRight: space.md,
    borderRadius: radius.pill, backgroundColor: "#F3F5F9",
  },
  actionPrimary: { backgroundColor: colors.accentWash },
  actionIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface,
  },
  actionIconPrimary: { backgroundColor: colors.dark },
});
