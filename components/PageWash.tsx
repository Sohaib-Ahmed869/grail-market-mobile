import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Bloom } from "./Bloom";
import { colors } from "../theme";

/** The ground every screen stands on.
 *
 *  Three layers, all of them nearly nothing:
 *
 *    1. the brand's light grey resolving to white — the base
 *    2. a navy tint at 10% falling from the top, so the page has a weight at
 *       the top edge where the header sits
 *    3. a gold bloom at the bottom right at 16%, which is the only warm thing
 *       on the page and keeps it from reading as a grey sheet
 *
 *  The first attempt at these numbers was half this strength and read as
 *  plain white on a real screen — a tint you have to be told about is not a
 *  tint. They are now high enough to see and still low enough that no piece
 *  of content has to fight them. Both are the brand's own navy and gold; no
 *  third colour is introduced anywhere.
 *
 *  One component, used by `Screen` and by the tab screens that build their
 *  own frame, so there is a single definition of what the app's paper looks
 *  like rather than one per screen. */
export function PageWash() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.washTop, colors.washMid, colors.washBottom]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(26,38,50,0.10)", "rgba(26,38,50,0.035)", "rgba(26,38,50,0)"]}
        locations={[0, 0.32, 0.7]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.gold}>
        <Bloom size={680} color={colors.accent} opacity={0.16} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // off the corner, so the falloff is visible on screen but the brightest
  // part of it never is — a visible hotspot would read as a smudge
  gold: { position: "absolute", right: -180, bottom: -300, width: 680, height: 680 },
});
