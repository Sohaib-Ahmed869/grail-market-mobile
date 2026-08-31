import { useMemo, useRef, useState } from "react";
import {
  FlatList, Modal, Pressable, StyleSheet, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { CountryCode } from "libphonenumber-js/min";
import { Txt } from "./Text";
import { COUNTRIES, dialCode, findCountry, flag } from "../lib/countries";
import { colors, radius, space, type } from "../theme";

type Props = {
  label: string;
  value: string;
  country: CountryCode;
  onChangeText: (v: string) => void;
  onChangeCountry: (c: CountryCode) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
};

/** Mobile number, with its country in front of it.
 *
 *  The dial code sits inside the field rather than above it, because +61 and
 *  the digits after it are one number — splitting them into two labelled
 *  inputs invites people to type the country code twice.
 *
 *  Australia is the default and is first in the list. Everyone else has to
 *  find their country; an Australian, which is nearly everyone here, has to do
 *  nothing at all. */
export function PhoneField({
  label, value, country, onChangeText, onChangeCountry, onBlur, error, hint,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [picking, setPicking] = useState(false);
  const input = useRef<TextInput>(null);
  const bad = Boolean(error);
  const c = findCountry(country);

  return (
    <View style={s.wrap}>
      <Txt variant="label" color={bad ? colors.down : focused ? colors.ink : colors.inkMuted}>
        {label}
      </Txt>

      <View style={[s.box, focused && s.boxFocused, bad && s.boxError]}>
        <Pressable
          onPress={() => setPicking(true)}
          style={({ pressed }) => [s.code, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={`Country: ${c.name}, ${dialCode(country)}. Change.`}
        >
          <Txt style={s.flag}>{flag(country)}</Txt>
          <Txt variant="body" color={colors.ink}>{dialCode(country)}</Txt>
          <Feather name="chevron-down" size={14} color={colors.inkFaint} />
        </Pressable>

        <View style={s.divider} />

        {/* No Pressable around this one. A Pressable parent wins the touch
            responder and the TextInput never receives the tap, so the keyboard
            never opens — the input is its own hit target and is stretched to
            fill the row so there is nothing to miss. */}
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder={country === "AU" ? "412 884 019" : "Mobile number"}
          placeholderTextColor={colors.inkFaint}
          selectionColor={colors.accent}
          style={s.input}
        />
      </View>

      {(error || hint) && (
        <View style={s.foot}>
          {bad && <Feather name="alert-circle" size={12} color={colors.down} />}
          <Txt variant="bodySmall" color={bad ? colors.down : colors.inkFaint} style={{ flex: 1 }}>
            {error ?? hint}
          </Txt>
        </View>
      )}

      <CountrySheet
        open={picking}
        selected={country}
        onClose={() => setPicking(false)}
        onPick={(code) => { onChangeCountry(code); setPicking(false); input.current?.focus(); }}
      />
    </View>
  );
}

function CountrySheet({
  open, selected, onPick, onClose,
}: {
  open: boolean; selected: CountryCode;
  onPick: (c: CountryCode) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return COUNTRIES;
    return COUNTRIES.filter(
      (x) => x.name.toLowerCase().includes(t) || dialCode(x.code).includes(t) || x.code.toLowerCase() === t,
    );
  }, [q]);

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.sheet} edges={["top", "bottom"]}>
        <View style={s.sheetBar}>
          <Txt variant="h2">Country</Txt>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Feather name="x" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <View style={s.search}>
          <Feather name="search" size={16} color={colors.inkFaint} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search"
            placeholderTextColor={colors.inkFaint}
            autoCorrect={false}
            style={s.searchInput}
          />
        </View>

        <FlatList
          data={list}
          keyExtractor={(x) => x.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: space.xxl }}
          ListEmptyComponent={
            <Txt variant="body" color={colors.inkFaint} center style={{ padding: space.xl }}>
              No match. We only list the countries our members use — tell us if yours is missing.
            </Txt>
          }
          renderItem={({ item }) => {
            const on = item.code === selected;
            return (
              <Pressable
                onPress={() => onPick(item.code)}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceSunk }]}
              >
                <Txt style={s.flag}>{flag(item.code)}</Txt>
                <Txt variant="body" style={{ flex: 1 }}>{item.name}</Txt>
                <Txt variant="body" color={colors.inkMuted}>{dialCode(item.code)}</Txt>
                {on && <Feather name="check" size={17} color={colors.accent} />}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 7 },
  box: {
    flexDirection: "row", alignItems: "center",
    height: 54, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.line, backgroundColor: colors.surfaceSunk,
  },
  boxFocused: {
    borderColor: colors.ink, backgroundColor: colors.surface,
    shadowColor: colors.ink, shadowOpacity: 0.10, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  boxError: { borderColor: colors.down, backgroundColor: colors.downWash },
  code: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingLeft: space.lg, paddingRight: space.md, height: "100%",
  },
  flag: { fontSize: 19 },
  divider: { width: 1, height: 24, backgroundColor: colors.line },
  input: {
    flex: 1, height: "100%",
    ...type.body, color: colors.ink,
    paddingHorizontal: space.md, paddingVertical: 0,
  },
  foot: { flexDirection: "row", alignItems: "center", gap: 5 },

  sheet: { flex: 1, backgroundColor: colors.surface },
  sheetBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: space.xl, paddingVertical: space.lg,
  },
  search: {
    flexDirection: "row", alignItems: "center", gap: space.sm,
    marginHorizontal: space.xl, marginBottom: space.md, paddingHorizontal: space.lg,
    height: 46, borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line,
  },
  searchInput: { flex: 1, ...type.body, color: colors.ink, paddingVertical: 0 },
  row: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.xl, paddingVertical: space.md,
  },
});
