import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Txt } from "./Text";

// The badges from the brand sheet, panels 7 and 8.
//
// Drawn rather than cropped out of the sheet: the source is a flattened JPEG,
// so a crop would be soft at 2x and impossible to recolour for a dark
// surface. As vector it is sharp at any size and the shield can be lifted out
// on its own for the places where the full lockup will not fit.
//
// The navy and gold here are the sheet's own #0F1B2A / #C8A868 rather than
// the app tokens. A trust mark that shifts colour between screens stops
// looking like a mark and starts looking like decoration.

const NAVY = "#0F1B2A";
const GOLD = "#C8A868";

/** The shield outline both badges are built on. */
function Shield({ size, children }: { size: number; children?: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size * 1.16 }}>
      <Svg width="100%" height="100%" viewBox="0 0 44 51">
        <Path
          d="M22 1.6 41.6 8.2v18.3c0 10.5-8 18.3-19.6 22.9C10.4 44.8 2.4 37 2.4 26.5V8.2z"
          fill={NAVY} stroke={GOLD} strokeWidth={2.4} strokeLinejoin="round"
        />
        {children}
      </Svg>
    </View>
  );
}

/** The tick, for the seller badge. */
function Tick() {
  return (
    <Path d="M13 25.5 19.5 32 32 18.5" fill="none" stroke="#FFFFFF"
      strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
  );
}

/** The G, for the GrailShield badge. Simplified from the mark — at 20pt the
 *  card element in the full logo is three grey pixels, so the shield carries
 *  the letterform alone. */
function G() {
  return (
    <>
      <Path
        d="M22 12.5a10.5 10.5 0 1 0 10.2 13H23.4v-4.9h13.1v3.2A15.4 15.4 0 1 1 22 7.6a15.3 15.3 0 0 1 10.6 4.2l-3.4 3.6A10.4 10.4 0 0 0 22 12.5z"
        fill="#FFFFFF"
      />
      <Path d="M12.8 12.2 22 8.4l9.2 3.8-9.2 2.2z" fill={GOLD} opacity={0.9} />
    </>
  );
}

export type BadgeKind = "seller" | "grailshield";

/** The full lockup: shield, then two lines of type on a navy plate. */
export function VerifiedBadge({
  kind = "seller", height = 34,
}: { kind?: BadgeKind; height?: number }) {
  const shield = height * 1.02;
  const top = kind === "seller" ? "SELLER" : "GRAILSHIELD";

  return (
    <View style={[s.lockup, { height, borderRadius: height * 0.26 }]}>
      <View style={[s.shieldHold, { marginLeft: -shield * 0.42 }]}>
        <Shield size={shield}>{kind === "seller" ? <Tick /> : <G />}</Shield>
      </View>
      <View style={s.words}>
        <Txt variant="overline" color="#FFFFFF" style={[s.top, { fontSize: height * 0.30 }]}>
          {top}
        </Txt>
        <Txt variant="overline" color={GOLD} style={[s.bottom, { fontSize: height * 0.21 }]}>
          VERIFIED
        </Txt>
      </View>
    </View>
  );
}

/** Just the shield, for a row that has no space for the words — a listing
 *  card, a comment byline, the greeting on the dashboard. */
export function VerifiedShield({ size = 18, kind = "seller" }: { size?: number; kind?: BadgeKind }) {
  return <Shield size={size}>{kind === "seller" ? <Tick /> : <G />}</Shield>;
}

/** Shield plus one word, for the middle case: a chip in a header. */
export function VerifiedChip({ label = "Verified", kind = "seller" }: { label?: string; kind?: BadgeKind }) {
  return (
    <View style={s.chip}>
      <VerifiedShield size={15} kind={kind} />
      <Txt variant="overline" color={GOLD} style={s.chipTxt}>{label}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  lockup: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: NAVY, borderWidth: 1.5, borderColor: GOLD,
    paddingRight: 14, alignSelf: "flex-start",
  },
  shieldHold: { justifyContent: "center" },
  words: { marginLeft: 10, justifyContent: "center" },
  top: { letterSpacing: 0.1, lineHeight: undefined },
  bottom: { letterSpacing: 3.4, marginTop: 1 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingLeft: 6, paddingRight: 9, paddingVertical: 4,
    borderRadius: 999, backgroundColor: NAVY,
    borderWidth: 1, borderColor: GOLD,
    alignSelf: "flex-start",
  },
  chipTxt: { fontSize: 11, letterSpacing: 0.1 },
});
