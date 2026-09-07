import { useState } from "react";
import { Image, StyleSheet, View, type ImageResizeMode, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { Icon } from "./Icon";
import { colors } from "../theme";

/** Card artwork, in the three states it actually has.
 *
 *  A bare <Image> has one: whatever is behind it. While a picture downloads
 *  the tile is the background colour, and when the URL is dead it stays that
 *  way — so "loading" and "broken" look identical, and both look like a
 *  layout bug rather than a picture.
 *
 *  Loading gets a shimmer, because a grid of grey rectangles that might be
 *  about to fill in is the one case where movement is information. Failure
 *  gets the same placeholder as a card that never had a picture: it is not a
 *  bug we can fix from here and the name below the tile still carries it.
 *
 *  Not hypothetical: assets.tcgdex.net — where every catalogue image in the
 *  app comes from — went to 404 on every path for an afternoon. Every tile in
 *  the product went blank at once and none of them said anything.
 */
/** Which picture this is, ignoring how we were let in to see it.
 *
 *  A signed S3 read carries the signature in the query string, so the SAME
 *  photograph arrives under a different URL every time it is re-signed. Keyed
 *  on the whole URL, the tile treated each of those as a new image: it
 *  remounted, went back to the shimmer, and downloaded a file it already had.
 *  On the market row that read as pictures appearing, vanishing on scroll and
 *  appearing again.
 *
 *  The path identifies the object; the query is only the permission to fetch
 *  it. So the identity is the part before the "?". */
const identityOf = (uri: string) => uri.split("?")[0] ?? uri;

export function CardArt({
  uri, resizeMode = "cover", iconSize = 20, style,
}: {
  uri?: string | null;
  resizeMode?: ImageResizeMode;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[s.fill, s.centre, style]}>
        <Icon name="card" size={iconSize} color={colors.inkFaint} />
      </View>
    );
  }

  return (
    <View style={[s.fill, style]}>
      {!loaded && <Shimmer />}
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode={resizeMode}
        // Reset on a new PICTURE, or a tile recycled by a list keeps the
        // state of whatever card it showed last — a loaded flag from the
        // previous image means the shimmer never appears for the new one.
        //
        // On the picture's identity rather than its full URL: a re-signed
        // read is the same photograph at a new address, and remounting for
        // that is what made the market tiles flicker.
        key={identityOf(uri)}
        onLoadEnd={() => setLoaded(true)}
        onError={() => { setFailed(true); setLoaded(true); }}
      />
    </View>
  );
}

/** A band of light travelling across the placeholder.
 *
 *  Opacity rather than a moving gradient: this can be on screen thirty times
 *  at once in a set of a hundred and fifty cards, and thirty animated
 *  gradients is a scroll that stutters on the phones people actually have. */
export function Shimmer({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 950, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [t]);
  const anim = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.45 }));
  return <Animated.View style={[s.fill, s.bone, anim, style]} pointerEvents="none" />;
}

const s = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  centre: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSunk },
  bone: { backgroundColor: colors.line },
});
