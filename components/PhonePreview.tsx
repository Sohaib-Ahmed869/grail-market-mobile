import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
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
 *
 *  And the phone has no bottom. It is drawn at full height, clipped part way
 *  down, and faded into the page from there — so it reads as a window onto a
 *  phone rather than a picture of one. A complete device with a rounded base
 *  sitting on the page is an object the eye has to account for; a fragment
 *  that dissolves is background, which is what it should be next to the words
 *  and the button that are actually the point.
 */
export function PhonePreview({
  notes, width = 220,
}: { notes: PreviewNote[]; width?: number }) {
  // The phone is drawn at its true proportion and then only the top of it is
  // shown. Both numbers matter: the first keeps the notch, clock and bezel in
  // the right relationship, the second decides how much of it we see.
  const h = width * 2.0;
  const visible = h * 0.72;
  // Below the clock, and placed so the last card sits in the fade rather than
  // above or below it — which is what makes them look like they are on a
  // screen that carries on past the bottom of the picture.
  const notesTop = h * 0.30;

  return (
    // No fixed height. Twice now the stage has been given a number that was
    // smaller than what it holds, and the cards have landed on the heading
    // underneath — React Native does not clip by default, so a container that
    // is too short simply overlaps whatever follows it. The cards sit in
    // normal flow instead and the stage takes the height they need.
    <View style={[s.stage, { width: width * 1.46, minHeight: visible }]} pointerEvents="none">
      {/* The ground the phone stands in. Without it the dark rectangle sits
          on flat white with nothing between the two, and both the phone and
          the cards read as stickers. A warm bloom behind it gives the group a
          centre and lets the fade land in something rather than in nothing. */}
      <View style={[s.wash, { width: width * 2.1, height: visible * 1.25 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="phoneWash" cx="50%" cy="42%" r="52%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.26} />
              <Stop offset="0.45" stopColor={colors.accent} stopOpacity={0.10} />
              <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#phoneWash)" />
        </Svg>
      </View>

      {/* Two views, not one. The shadow has to live outside the clip, or it
          gets cut off with everything else and the phone sits flat.
          
          The lift is deliberately SHORTER than what it holds. A shadow is
          drawn around its own frame, bottom edge included, so a full-height
          one drew a soft horizontal line across the fade — the phone
          dissolved and then a shadow underlined where it used to end. Ending
          the lift up in the opaque part means only the sides and top are ever
          seen, which is all a shadow is doing here. */}
      <View style={[s.lift, { width, height: visible * 0.5 }]}>
        <View style={[s.clip, { width, height: visible }]}>
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
        </View>

        {/* The dissolve, inside the lift so it is positioned against the
            phone rather than against a stage whose height now varies. It has
            to be the page's own colour, not a translucent white — over a
            tinted ground a white fade greys out instead of disappearing, and
            the phone ends in a visible haze. */}
        {/* Positioned off the clip's height, not the lift's, and given most
            of it to travel through. A short fade is a soft edge; a long one
            is a dissolve, and only the second reads as the picture carrying
            on past the bottom of the frame. */}
        <LinearGradient
          colors={[
            "rgba(250,251,252,0)",
            "rgba(250,251,252,0.5)",
            "rgba(250,251,252,0.9)",
            colors.washBottom,
            colors.washBottom,
          ]}
          // Fully opaque by 82%, not at 100%. Landing exactly on the clip's
          // edge leaves the last two or three percent of the phone showing,
          // which is a faint hard line right where the dissolve was supposed
          // to have finished — the fade has to be over before the cut, not at
          // it.
          locations={[0, 0.38, 0.66, 0.82, 1]}
          style={[s.fade, { top: visible * 0.30, height: visible * 0.72 }]}
        />
      </View>

      {/* A spacer rather than a `top`, so the cards below it are in flow and
          the stage can measure them. */}
      <View style={{ height: notesTop }} />

      {/* Wider than the phone by a clear margin on both sides. Sitting inside
          it they were a screenshot of a lock screen; hanging well past it they
          are the subject and the phone is scenery — which is the whole reason
          the phone is there. */}
      <View style={[s.notes, { paddingHorizontal: width * 0.055 }]}>
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
  wash: { position: "absolute", top: 0, alignSelf: "center" },
  lift: {
    position: "absolute", top: 0,
    shadowColor: "#0B1622", shadowOpacity: 0.22, shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 }, elevation: 12,
  },
  clip: { position: "absolute", top: 0, overflow: "hidden", borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  phone: {
    position: "absolute", top: 0, borderRadius: 34, overflow: "hidden",
    borderWidth: 5, borderColor: "#0B1622",
  },
  fade: { position: "absolute", left: 0, right: 0 },
  notch: {
    alignSelf: "center", marginTop: 10, width: 74, height: 20, borderRadius: 10,
    backgroundColor: "#0B1622",
  },
  clockWrap: { alignItems: "center", marginTop: 12 },
  day: { ...type.bodySmall, fontSize: 11.5 },
  clock: { ...type.display, fontSize: 42, lineHeight: 50, letterSpacing: -1.5 },
  // In flow and full width of the stage, so the stage measures them and the
  // cards still hang past the phone on both sides.
  notes: { alignSelf: "stretch" },
  note: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    paddingVertical: 10, paddingHorizontal: space.md,
    borderRadius: radius.md, backgroundColor: colors.surface,
    // A hairline as well as the shadow. On the pale part of the fade the
    // shadow alone leaves the card's edge undefined, and it stops looking
    // like a card and starts looking like a patch of the background.
    borderWidth: 1, borderColor: colors.line,
    shadowColor: "#0B1622", shadowOpacity: 0.12, shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  noteHead: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  noteIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
});
