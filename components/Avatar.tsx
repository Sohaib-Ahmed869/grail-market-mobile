import Svg, {
  Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop, G,
} from "react-native-svg";
import { View } from "react-native";
import { Txt } from "./Text";
import { avatarFor, initialsOf, type Face } from "../lib/avatars";
import { colors } from "../theme";

// A character, drawn.
//
// Everything here is on a 100x100 grid so one set of coordinates works at
// 20pt in a comment row and at 92pt on the picker. Parts are separate
// functions rather than twelve hand-drawn faces, because twelve drawings
// would be twelve things to keep consistent and this is one thing with
// twelve settings.
//
// The ink is the same near-black everywhere. Cartoon faces read as a set when
// the outline colour is shared and the fills differ; give each one its own
// outline and they stop being siblings.

const INK = "#16202B";

function Eyes({ kind }: { kind: Face["eyes"] | "closed" }) {
  switch (kind) {
    // A blink is the same face with its eyes shut, not a different face. Two
    // shallow arcs read as closed at every size the grid is used at; a filled
    // line reads as a scowl once it is 20pt in a comment row.
    case "closed":
      return (
        <G stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none">
          <Path d="M31 48 q6 5 12 0" />
          <Path d="M57 48 q6 5 12 0" />
        </G>
      );
    case "happy":
      return (
        <G stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none">
          <Path d="M31 47 q6 -7 12 0" />
          <Path d="M57 47 q6 -7 12 0" />
        </G>
      );
    case "wink":
      return (
        <G>
          <Circle cx="37" cy="47" r="4.6" fill={INK} />
          <Path d="M57 47 q6 -6 12 0" stroke={INK} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        </G>
      );
    case "wide":
      return (
        <G>
          <Circle cx="37" cy="46" r="7.5" fill="#FFFFFF" />
          <Circle cx="63" cy="46" r="7.5" fill="#FFFFFF" />
          <Circle cx="38.5" cy="47" r="3.6" fill={INK} />
          <Circle cx="64.5" cy="47" r="3.6" fill={INK} />
        </G>
      );
    case "shade":
      return (
        <G>
          <Path d="M25 42 h50 v5 q0 9 -11 9 t-12 -9 h-4 q-1 9 -12 9 t-11 -9 z" fill={INK} />
        </G>
      );
    case "star":
      return (
        <G fill={INK}>
          <Path d="M37 40 l2.6 5.4 5.9 .8 -4.3 4.1 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.1 5.9 -.8 z" />
          <Circle cx="63" cy="47" r="4.6" />
        </G>
      );
    default:
      return (
        <G fill={INK}>
          <Circle cx="37" cy="47" r="4.8" />
          <Circle cx="63" cy="47" r="4.8" />
        </G>
      );
  }
}

function Mouth({ kind }: { kind: Face["mouth"] }) {
  switch (kind) {
    case "grin":
      return <Path d="M38 62 q12 12 24 0 z" fill={INK} />;
    case "flat":
      return <Path d="M42 64 h16" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
    case "smirk":
      return <Path d="M40 63 q10 7 18 -2" stroke={INK} strokeWidth={4} strokeLinecap="round" fill="none" />;
    case "open":
      return <Ellipse cx="50" cy="65" rx="8" ry="6.5" fill={INK} />;
    case "none":
      return null;
    default:
      return <Path d="M39 61 q11 10 22 0" stroke={INK} strokeWidth={4.2} strokeLinecap="round" fill="none" />;
  }
}

function Topping({ kind, from, to }: { kind: Face["top"]; from: string; to: string }) {
  switch (kind) {
    case "ears":
      return (
        <G fill="url(#body)" stroke={INK} strokeWidth={3}>
          <Path d="M24 22 l4 20 -16 -8 z" />
          <Path d="M76 22 l-4 20 16 -8 z" />
        </G>
      );
    case "horns":
      return (
        <G fill={to} stroke={INK} strokeWidth={3}>
          <Path d="M28 20 q-6 -12 4 -16 -2 10 6 14 z" />
          <Path d="M72 20 q6 -12 -4 -16 2 10 -6 14 z" />
        </G>
      );
    case "crest":
      return <Path d="M50 4 q10 10 6 20 -8 -6 -12 0 -4 -10 6 -20 z" fill={to} stroke={INK} strokeWidth={3} />;
    case "cap":
      return (
        <G stroke={INK} strokeWidth={3}>
          <Path d="M22 32 q28 -24 56 0 z" fill={to} />
          <Path d="M18 32 h30 v6 h-30 q-3 -3 0 -6 z" fill={to} />
        </G>
      );
    case "halo":
      return <Ellipse cx="50" cy="13" rx="18" ry="5.5" fill="none" stroke="#E4C284" strokeWidth={4} />;
    default:
      return null;
  }
}

function Chest({ kind }: { kind: Face["chest"] }) {
  switch (kind) {
    case "bolt":
      return <Path d="M52 78 l-8 12 h6 l-3 9 10 -13 h-6 z" fill={INK} opacity={0.55} />;
    case "star":
      return <Path d="M50 78 l3 6.5 7 1 -5 5 1.2 7 -6.2 -3.4 -6.2 3.4 1.2 -7 -5 -5 7 -1 z" fill={INK} opacity={0.5} />;
    case "diamond":
      return <Path d="M50 78 l9 9 -9 10 -9 -10 z" fill={INK} opacity={0.5} />;
    case "flame":
      return <Path d="M50 77 q7 8 4 14 -4 6 -8 0 -3 -6 4 -14 z" fill={INK} opacity={0.5} />;
    default:
      return null;
  }
}

/** Someone's face, at whatever size the screen needs. */
export function Avatar({
  name, id, size = 40, ring = false, eyes,
}: {
  name: string; id?: string | null; size?: number; ring?: boolean;
  /** Override the preset's eyes for a moment. Only AnimatedAvatar uses this,
   *  to blink; the face is otherwise entirely decided by its preset. */
  eyes?: Face["eyes"] | "closed";
}) {
  const a = avatarFor(id, name || "?");

  // Below about 22pt the eyes and mouth are sub-pixel, so initials read better
  // than a smudge. The body colours stay, so it is still recognisably them.
  if (size < 22 || a.id === "none") {
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: a.to,
        alignItems: "center", justifyContent: "center",
        ...(ring ? { borderWidth: 2, borderColor: colors.onDark } : null),
      }}>
        <Txt variant="h3" color={colors.onDark} style={{ fontSize: size * 0.4 }}>
          {initialsOf(name)}
        </Txt>
      </View>
    );
  }

  const gid = `body-${a.id}`;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, overflow: "hidden",
      ...(ring ? { borderWidth: 2, borderColor: colors.onDark } : null),
    }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={a.from} />
            <Stop offset="1" stopColor={a.to} />
          </LinearGradient>
          <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={a.from} />
            <Stop offset="1" stopColor={a.to} />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="100" height="100" fill={a.bg} />
        <Topping kind={a.top} from={a.from} to={a.to} />
        {/* the body: a rounded blob rather than a circle, so the character has
            shoulders and does not read as a ball with a face on it */}
        <Path
          d="M50 16 q26 0 26 28 0 16 -8 24 12 6 12 20 v12 H20 v-12 q0 -14 12 -20 -8 -8 -8 -24 0 -28 26 -28 z"
          fill={`url(#${gid})`} stroke={INK} strokeWidth={3.5} strokeLinejoin="round"
        />
        <Eyes kind={eyes ?? a.eyes} />
        <Mouth kind={a.mouth} />
        <Chest kind={a.chest} />
      </Svg>
    </View>
  );
}
