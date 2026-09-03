import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, type IconName } from "./Icon";
import { Txt } from "./Text";
import { colors, radius, space, type } from "../theme";

export type PreviewNote = {
  icon: IconName;
  tone: string;
  title: string;
  body: string;
  when: string;
};

/** A phone, showing the thing being asked for.
 *
 *  Asking "can we send you notifications?" with nothing on screen makes a
 *  person guess what they are agreeing to, and the safe guess is spam. So the
 *  screen shows the actual notifications: an offer on your card, a message
 *  from a buyer, a price move you asked to be told about. Three specific
 *  things beat any sentence about staying up to date.
 *
 *  The cards break out past the phone's left and right edges on purpose. Kept
 *  inside they are a screenshot; overlapping the frame they are the subject,
 *  and the phone is scenery.
 */
export function PhonePreview({
  notes, width = 220,
}: { notes: PreviewNote[]; width?: number }) {
  const h = width * 1.62;
  // The stage has to be as tall as the phone, not shorter. It was 0.86 of it,
  // which cropped the phone's bottom AND let the absolutely-positioned cards
  // hang out of the box and land on the heading underneath — a container
  // smaller than what it holds does not clip in React Native, it overlaps.
  const stageH = h + 10;
  // Below the clock, and high enough that three cards finish inside the
  // phone rather than running off the end of it.
  const notesTop = h * 0.38;

  return (
    <View style={[s.stage, { width: width * 1.5, height: stageH }]} pointerEvents="none">
      <View style={[s.phone, { width, height: h }]}>
        <LinearGradient
          colors={["#2C3E52", colors.dark, "#0A1219"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.notch} />
        <View style={s.clockWrap}>
          <Txt style={s.day} color="rgba(255,255,255,0.72)">Tuesday, 3 September</Txt>
          <Txt style={s.clock} color={colors.onDark}>9:41</Txt>
        </View>
      </View>

      {/* Breaking out by an eighth of the phone's width, not a quarter. Wide
          enough to read as sitting on top of it, narrow enough that the phone
          still shows down both sides — past that it stops being a phone and
          becomes a dark shape behind some cards. */}
      <View style={[s.notes, { top: notesTop, left: width * 0.13, right: width * 0.13 }]}>
        {notes.map((n, i) => (
          <Animated.View
            key={n.title}
            // Staggered, and downward: they arrive the way a notification
            // arrives, one after another, rather than a stack appearing.
            entering={FadeInDown.duration(460).delay(380 + i * 220)}
            style={[s.note, i > 0 && { marginTop: space.sm }]}
          >
            <View style={[s.noteIcon, { backgroundColor: n.tone }]}>
              <Icon name={n.icon} size={15} color={colors.onPrimary} filled />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.noteHead}>
                <Txt variant="button" numberOfLines={1} style={{ flex: 1 }}>{n.title}</Txt>
                <Txt variant="bodySmall" color={colors.inkFaint}>{n.when}</Txt>
              </View>
              <Txt variant="bodySmall" color={colors.inkMuted} numberOfLines={1}>
                {n.body}
              </Txt>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { alignItems: "center" },
  phone: {
    position: "absolute", top: 0, borderRadius: 34, overflow: "hidden",
    borderWidth: 5, borderColor: "#0B1622",
    shadowColor: "#0B1622", shadowOpacity: 0.28, shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 }, elevation: 14,
  },
  notch: {
    alignSelf: "center", marginTop: 10, width: 74, height: 20, borderRadius: 10,
    backgroundColor: "#0B1622",
  },
  clockWrap: { alignItems: "center", marginTop: 12 },
  day: { ...type.bodySmall, fontSize: 11.5 },
  clock: { ...type.display, fontSize: 42, lineHeight: 50, letterSpacing: -1.5 },
  // Absolute, so the cards can hang past the phone on both sides without the
  // phone's width constraining them. `top` is set from the phone's real
  // height rather than a percentage of the stage — the two are not the same
  // number, which is how they ended up over the clock.
  notes: { position: "absolute" },
  note: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingVertical: 9, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: colors.surface,
    shadowColor: "#0B1622", shadowOpacity: 0.14, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  noteHead: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  noteIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
});
