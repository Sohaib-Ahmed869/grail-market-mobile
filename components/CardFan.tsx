import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Txt } from "./Text";
import { colors, radius, shadow, space } from "../theme";

const CARDS = [
  { label: "PSA 10", name: "Umbreon VMAX",  tint: "#3B3560", rot: -13, x: -74, y: 16, z: 1 },
  { label: "BGS 9.5", name: "Luffy OP01-003", tint: "#5A3730", rot: 13, x: 74, y: 16, z: 1 },
  { label: "PSA 10", name: "Charizard VMAX", tint: "#8A4A22", rot: 0,  x: 0,  y: 0,  z: 2 },
];

/** The three slabs on the welcome screen.
 *
 *  Drawn rather than photographed: a real photograph of three specific cards
 *  dates the screen, weighs a megabyte, and implies we stock them. These are
 *  the shape of a graded holder — label bar, window, footer — which is all the
 *  image has to say. */
export function CardFan({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.wrap, style]} pointerEvents="none">
      {CARDS.map((c) => (
        <View
          key={c.name}
          style={[
            s.card, shadow.lifted,
            { transform: [{ rotate: `${c.rot}deg` }, { translateX: c.x }, { translateY: c.y }], zIndex: c.z },
          ]}
        >
          <View style={s.label}>
            <Txt variant="overline" color={colors.ink} style={{ fontSize: 7, letterSpacing: 0.8 }}>
              {c.label}
            </Txt>
          </View>
          <View style={[s.window, { backgroundColor: c.tint }]} />
          <Txt variant="overline" color={colors.inkFaint} style={s.name} numberOfLines={1}>
            {c.name}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", height: 190, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  card: {
    position: "absolute", width: 96, height: 148, padding: 5,
    borderRadius: radius.sm, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: "#E8ECF1", alignItems: "center", gap: 4,
  },
  label: {
    alignSelf: "stretch", height: 14, borderRadius: 3,
    alignItems: "center", justifyContent: "center", backgroundColor: "#EEF1F5",
  },
  window: { alignSelf: "stretch", flex: 1, borderRadius: 4 },
  name: { fontSize: 6, letterSpacing: 0.4 },
});
