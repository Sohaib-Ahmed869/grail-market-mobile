import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { colors, radius, space } from "../theme";

export type Option = { value: string; label: string; hint?: string };

/** A boxed field with a floating label that opens a list.
 *
 *  A wheel picker hides every option but one and is unusable on a ladder of
 *  eleven grades where the wording matters. This shows the whole ladder, with
 *  the chosen rung marked. */
export function Picker({
  label, value, options, onChange, placeholder = "Select",
}: {
  label: string;
  value: string | null;
  options: Option[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={s.box}>
        <Txt variant="overline" color={colors.inkFaint} style={s.label}>{label}</Txt>
        <Txt variant="body" color={chosen ? colors.ink : colors.inkFaint} numberOfLines={1} style={{ flex: 1 }}>
          {chosen?.label ?? placeholder}
        </Txt>
        <Feather name="chevron-down" size={17} color={colors.inkMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.scrim} onPress={() => setOpen(false)} />
        <View style={s.sheet}>
          <View style={s.grab} />
          <Txt variant="h2">{label}</Txt>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            style={{ marginTop: space.md }}
            renderItem={({ item }) => {
              const on = item.value === value;
              return (
                <Pressable
                  onPress={() => { onChange(item.value); setOpen(false); }}
                  style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceSunk }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3" color={on ? colors.ink : colors.inkMuted}>{item.label}</Txt>
                    {item.hint && <Txt variant="bodySmall" color={colors.inkFaint}>{item.hint}</Txt>}
                  </View>
                  {on && <Feather name="check" size={17} color={colors.ink} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    height: 58, paddingHorizontal: space.md, paddingTop: 12,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.field,
  },
  label: { position: "absolute", top: 8, left: space.md, fontSize: 11.5, letterSpacing: 0.1 },
  scrim: { flex: 1, backgroundColor: "rgba(11,22,34,0.4)" },
  sheet: {
    maxHeight: "70%", backgroundColor: colors.surface,
    padding: space.xl, paddingBottom: space.xxxl,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: "center", marginBottom: space.lg },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
});
