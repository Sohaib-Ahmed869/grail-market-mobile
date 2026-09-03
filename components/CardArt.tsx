import { useState } from "react";
import { Image, StyleSheet, View, type ImageResizeMode } from "react-native";
import { Icon } from "./Icon";
import { colors } from "../theme";

/** Card artwork that survives the picture not being there.
 *
 *  A bare <Image> with a dead URL renders nothing at all — the background
 *  shows through and the tile becomes a grey void that looks like a layout
 *  bug. It is not a layout bug and the app cannot fix it, so the honest
 *  behaviour is to show the same placeholder as a card that never had a
 *  picture, and let the name and the price carry the tile.
 *
 *  This is not hypothetical: assets.tcgdex.net — where every catalogue image
 *  in the app comes from — went to 404 on every path while this was written.
 *  Every tile in the product went blank at once, and none of them said so.
 */
export function CardArt({
  uri, resizeMode = "cover", iconSize = 20,
}: {
  uri?: string | null;
  resizeMode?: ImageResizeMode;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={s.empty}>
        <Icon name="card" size={iconSize} color={colors.inkFaint} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      resizeMode={resizeMode}
      // Reset on a new URL, or a tile recycled by a list keeps the failure of
      // whatever card it showed last.
      key={uri}
      onError={() => setFailed(true)}
    />
  );
}

const s = StyleSheet.create({
  empty: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
