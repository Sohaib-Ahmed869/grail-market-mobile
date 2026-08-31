import { Text, View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts } from "../theme";

/** "GrailMarket" — white "Grail", gold "Market".
 *
 *  Set as live text rather than shipped as an image. The brand sheet names
 *  Poppins SemiBold as the logo face, so the letterforms are the real ones,
 *  and text stays sharp at any size on any density. The supplied artwork is a
 *  JPEG on a light ground: keying it to transparency left halos around every
 *  stroke, which is worse than setting it properly. */
export function Wordmark({ size = 26, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} accessibilityRole="image" accessibilityLabel="GrailMarket">
      <Text style={[s.word, { fontSize: size, lineHeight: size * 1.18 }]}>
        <Text style={s.grail}>Grail</Text>
        <Text style={s.market}>Market</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  word: { fontFamily: fonts.heading, letterSpacing: -0.3 },
  grail: { color: colors.text },
  market: { color: colors.accent },
});
