import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { BackButton } from "./BackButton";
import { PhonePreview, type PreviewNote } from "./PhonePreview";
import { Txt } from "./Text";
import { Button } from "./Button";
import { useHideNav } from "../lib/navbar";
import { colors, space } from "../theme";

/** What a guest sees where a member's screen would be.
 *
 *  Browsing needs no account and scanning does — not as a growth tactic but
 *  because a scan costs a paid lookup and a collection has to belong to
 *  somebody. So the gate says which of those it is, rather than "sign in to
 *  continue", and it never pretends the feature is broken.
 *
 *  It SHOWS what an account is rather than listing it. This was three ticked
 *  bullets in a white box, which is the shape of a pricing page and is read
 *  the way a pricing page is read — which is to say not at all. A phone with
 *  an offer landing on it, a buyer's message and a price move says the same
 *  three things and cannot be skimmed, because there is nothing to skim.
 *
 *  It takes the whole screen, tab bar included. This is one decision, and a
 *  row of five destinations under it says the opposite — that this is a page
 *  among pages you might tab past. The way out is the arrow at the top, which
 *  is the only navigation a page like this needs.
 */
export function JoinGate({
  title, why, preview,
}: {
  title: string;
  why: string;
  /** The three things this particular gate is holding back, shown as the
   *  notifications a member would have got. */
  preview: PreviewNote[];
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  useHideNav();

  // The phone scales to the screen rather than to a number. On a small device
  // it shrinks so the copy and the buttons keep their room; it never grows
  // past a size where it stops being a prop and becomes a poster.
  //
  // 0.66 of the screen. Below that the phone is a stripe behind the cards
  // rather than the thing they are sitting on.
  const phoneW = Math.max(190, Math.min(268, Math.min(width * 0.66, height * 0.3)));

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.fill}>
        <View style={s.topBar}>
          <BackButton onPress={() => router.replace("/(tabs)/home")} />
          <Txt variant="bodySmall" color={colors.inkFaint}>Guest</Txt>
        </View>

        <View style={s.body}>
          <PhonePreview notes={preview} width={phoneW} />

          <Animated.View entering={FadeInDown.duration(440).delay(180)} style={s.copy}>
            <Txt variant="display" center>{title}</Txt>
            <Txt variant="body" color={colors.inkMuted} center style={s.why}>
              {why}
            </Txt>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.duration(440).delay(320)}
          style={[s.foot, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm }]}
        >
          <Button label="Create an account" pill onPress={() => router.push("/signup")} />
          {/* A link, not a second button. Two bordered boxes give both choices
              equal weight when one of them is plainly the answer for most
              people standing here. */}
          <Button
            label="I already have an account"
            kind="link"
            onPress={() => router.push("/signin")}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.washBottom },
  fill: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xl, paddingTop: space.xs, paddingBottom: space.sm,
  },
  // The heading needs air under the phone or the two read as one block. The
  // fade already softens the join; the gap is what separates the picture from
  // the sentence about it.
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.xxxl },
  copy: { alignItems: "center", paddingHorizontal: space.xl },
  why: { marginTop: space.md },
  foot: { paddingHorizontal: space.xl, paddingTop: space.lg, gap: 2 },
});
