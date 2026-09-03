import { StyleSheet, View } from "react-native";
import { Avatar } from "./Avatar";
import { Txt } from "./Text";
import { colors, radius, space } from "../theme";

export type Interest = {
  following: number;
  holding: number;
  views: number;
  faces: string[];
};

/** Who else is interested in this card.
 *
 *  Every number is counted from something somebody actually did — followed
 *  it, holds one, opened a listing for it. A card nobody has touched says so
 *  rather than showing a plausible-looking figure, because the whole value of
 *  a number like this is that it can be trusted when it is high.
 *
 *  The faces are the app's own fixed set of drawings, not photographs and not
 *  a list of who is watching. Naming them would tell the person about to sell
 *  a card exactly who wants it.
 */
export function InterestBar({ interest }: { interest: Interest }) {
  const { following, holding, views, faces } = interest;
  const nobody = following + holding + views === 0;

  const parts = [
    following > 0 && `${following} following`,
    holding > 0 && `${holding} ${holding === 1 ? "collection" : "collections"}`,
    views > 0 && `${views} ${views === 1 ? "view" : "views"}`,
  ].filter(Boolean) as string[];

  return (
    <View style={s.wrap}>
      {faces.length > 0 && (
        <View style={s.faces}>
          {faces.slice(0, 4).map((f, i) => (
            // Overlapped, each with a ring in the page colour so the one
            // behind reads as behind rather than as a smudge.
            <View key={f + i} style={[s.face, i > 0 && { marginLeft: -12 }]}>
              <Avatar name={f} id={f} size={28} />
            </View>
          ))}
          {following > faces.length && (
            <View style={[s.face, s.more, { marginLeft: -12 }]}>
              <Txt variant="bodySmall" color={colors.inkMuted} style={s.moreTxt}>
                +{following - faces.length}
              </Txt>
            </View>
          )}
        </View>
      )}

      <Txt variant="bodySmall" color={nobody ? colors.inkFaint : colors.inkMuted} style={{ flex: 1 }}>
        {nobody
          ? "Nobody here is following this one yet"
          : parts.join(" · ")}
      </Txt>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md, paddingHorizontal: space.lg,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  faces: { flexDirection: "row", alignItems: "center" },
  face: {
    borderRadius: 16, borderWidth: 2, borderColor: colors.surface,
    overflow: "hidden",
  },
  more: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSunk,
  },
  moreTxt: { fontSize: 11.5, fontWeight: "600" },
});
