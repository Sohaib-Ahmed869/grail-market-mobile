import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { colors, radius, space, type } from "../theme";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  secure?: boolean;
  error?: string;
  icon?: keyof typeof Feather.glyphMap;
  /** Rendered before the input, inside the box — the phone field's country
   *  button goes here. Anything in this slot must handle its own presses. */
  left?: React.ReactNode;
  /** 0–3, drawn as a bar under the field. Only the password uses it. */
  strength?: number;
  /** Sits at the right end of the LABEL row. "Forgot password?" goes here.
   *
   *  It used to be its own right-aligned line under the field, which is a
   *  fourth element in a three-element stack and lines up with nothing. On
   *  the label row it shares a baseline with the label and the row it belongs
   *  to reads as one thing. */
  action?: React.ReactNode;
  /** Hold the space an error would take, so showing one does not shove every
   *  field below it down the screen.
   *
   *  Off by default — most forms never error and the reserved line would be a
   *  gap under every field for nothing. On wherever validation is live. */
  reserve?: boolean;
};

/** A labelled input.
 *
 *  The label sits above rather than floating inside. A floating label is the
 *  fashionable choice and it is the wrong one here: people fill this form
 *  copying from a physical licence, looking down and back up, and a label that
 *  has shrunk into the corner is exactly what they need when they return.
 *
 *  Focus is shown by the ring AND the icon taking the accent colour, because a
 *  border alone is easy to miss on a screen held at arm's length. */
export function Field({
  label, hint, secure, error, icon, strength, left, action, reserve, ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));
  const input = useRef<TextInput>(null);
  const bad = Boolean(error);

  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Txt
          variant="label"
          color={bad ? colors.down : focused ? colors.ink : colors.inkMuted}
          style={s.label}
          numberOfLines={1}
        >
          {label}
        </Txt>
        {action}
      </View>

      {/* The whole box focuses the input, not just the 
          text itself. A field is a target the size of the box as far as
          anyone tapping it is concerned, and hitting the icon or the padding
          either side of the caret did nothing at all. */}
      <Pressable
        onPress={() => input.current?.focus()}
        style={[s.box, focused && s.boxFocused, bad && s.boxError]}
      >
        {left}
        {/* A fixed-width slot, not a bare glyph. Feather characters do not
            share an advance width — "mail" is wider than "lock" — so letting
            them size themselves started the text at a different x in every
            field, which is exactly the ragged left edge a stack of inputs
            must not have. */}
        {icon && (
          <View style={s.iconSlot}>
            <Feather
              name={icon}
              size={17}
              color={bad ? colors.down : focused ? colors.ink : colors.inkFaint}
            />
          </View>
        )}
        <TextInput
          ref={input}
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor={colors.inkFaint}
          selectionColor={colors.accent}
          style={s.input}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            // Same fixed slot as the leading icon, for the same reason: "eye"
            // and "eye-off" are different widths, so toggling it nudged the
            // right edge of the text and the caret jumped as you revealed.
            style={s.iconSlot}
          >
            <Feather
              name={hidden ? "eye" : "eye-off"}
              size={17}
              color={focused ? colors.inkMuted : colors.inkFaint}
            />
          </Pressable>
        )}
      </Pressable>

      {strength != null && <Strength level={strength} />}

      {(error || hint || reserve) && (
        <View style={[s.foot, reserve && s.footReserved]}>
          {bad && <Feather name="alert-circle" size={12} color={colors.down} />}
          <Txt variant="bodySmall" color={bad ? colors.down : colors.inkFaint} style={s.footTxt}>
            {error ?? hint ?? ""}
          </Txt>
        </View>
      )}
    </View>
  );
}

/** Three segments, not a percentage.
 *
 *  A meter that creeps up per character invites people to add one more
 *  character until it turns green, which is how Passw0rd! gets made. Three
 *  states map to the three things the rule actually cares about. */
function Strength({ level }: { level: number }) {
  const tone = level >= 3 ? colors.up : level === 2 ? colors.accent : colors.down;
  return (
    <View style={s.meter}>
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          style={[s.seg, { backgroundColor: n <= level ? tone : colors.line }]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 7 },
  // baseline, not centre: the label and whatever sits opposite it are both
  // text, and centring them leaves the two sitting at different heights the
  // moment their sizes differ by a point.
  labelRow: { flexDirection: "row", alignItems: "baseline", gap: space.md },
  label: { flex: 1 },
  iconSlot: { width: 20, alignItems: "center" },
  box: {
    flexDirection: "row", alignItems: "center", gap: 10,
    height: 54, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.fieldLine, backgroundColor: colors.field,
  },
  // Colour and shadow only — never the border WIDTH. React Native draws
  // borders inside the box, so 1.5 -> 2 on focus moves the edge half a point
  // and the field visibly jumps out of line with the one under it. That is
  // the misalignment: two fields with different stroke weights, one because
  // it happened to have the caret.
  boxFocused: {
    borderColor: colors.fieldLineFocus, backgroundColor: colors.surface,
    shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  boxError: { borderColor: colors.down, backgroundColor: colors.downWash },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  meter: { flexDirection: "row", gap: 5, marginTop: 1 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  foot: { flexDirection: "row", alignItems: "center", gap: 5 },
  // One line's worth, always. The alternative is every field below this one
  // jumping down as you tab out of it.
  footReserved: { minHeight: 16 },
  footTxt: { flex: 1 },
});
