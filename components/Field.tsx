import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { colors, radius, space, type } from "../theme";

/** A labelled input. The label sits above rather than floating: a form the
 *  user is filling from a physical document should never hide what a field
 *  wanted once there is text in it. */
export function Field({
  label, hint, secure, error, ...rest
}: TextInputProps & { label: string; hint?: string; secure?: boolean; error?: string }) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View style={s.wrap}>
      <Txt variant="label" color={colors.inkMuted}>{label}</Txt>
      <View style={[s.box, focused && s.boxFocused, Boolean(error) && s.boxError]}>
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor={colors.inkFaint}
          style={s.input}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
          >
            <Feather name={hidden ? "eye" : "eye-off"} size={17} color={colors.inkFaint} />
          </Pressable>
        )}
      </View>
      {(error || hint) && (
        <Txt variant="bodySmall" color={error ? colors.down : colors.inkFaint}>
          {error ?? hint}
        </Txt>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  box: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 52, paddingHorizontal: space.lg,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.line, backgroundColor: colors.surfaceSunk,
  },
  boxFocused: { borderColor: colors.ink, backgroundColor: colors.surface },
  boxError: { borderColor: colors.down, backgroundColor: colors.downWash },
  input: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
});
