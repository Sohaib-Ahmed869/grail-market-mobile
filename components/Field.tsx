import { useState } from "react";
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
  /** 0–3, drawn as a bar under the field. Only the password uses it. */
  strength?: number;
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
export function Field({ label, hint, secure, error, icon, strength, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));
  const bad = Boolean(error);

  return (
    <View style={s.wrap}>
      <Txt variant="label" color={bad ? colors.down : focused ? colors.ink : colors.inkMuted}>
        {label}
      </Txt>

      <View style={[s.box, focused && s.boxFocused, bad && s.boxError]}>
        {icon && (
          <Feather
            name={icon}
            size={17}
            color={bad ? colors.down : focused ? colors.ink : colors.inkFaint}
          />
        )}
        <TextInput
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
          >
            <Feather name={hidden ? "eye" : "eye-off"} size={17} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>

      {strength != null && <Strength level={strength} />}

      {(error || hint) && (
        <View style={s.foot}>
          {bad && <Feather name="alert-circle" size={12} color={colors.down} />}
          <Txt variant="bodySmall" color={bad ? colors.down : colors.inkFaint} style={s.footTxt}>
            {error ?? hint}
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
  box: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    height: 54, paddingHorizontal: space.lg,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.line, backgroundColor: colors.surfaceSunk,
  },
  boxFocused: {
    borderColor: colors.ink, backgroundColor: colors.surface,
    shadowColor: colors.ink, shadowOpacity: 0.10, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  boxError: { borderColor: colors.down, backgroundColor: colors.downWash },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  meter: { flexDirection: "row", gap: 5, marginTop: 1 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  foot: { flexDirection: "row", alignItems: "center", gap: 5 },
  footTxt: { flex: 1 },
});
