import { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { CountryCode } from "libphonenumber-js/min";
import { Field } from "./Field";
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
 *  This is a `Field` with something in its left slot, not a second input
 *  implementation. It used to be its own component and spent three rounds of
 *  fixes not opening the keyboard, while the field beside it — same job, same
 *  props — worked. Two implementations of one control is two sets of bugs and
 *  only one of them gets tested.
 *
 *  Australia is preselected and first in the list, so the case that is nearly
 *  everyone costs no taps at all. */
export function PhoneField({
  label, value, country, onChangeText, onChangeCountry, onBlur, error, hint,
}: Props) {
  const [picking, setPicking] = useState(false);
  const c = findCountry(country);

  return (
    <>
      <Field
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        error={error}
        hint={hint}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder={country === "AU" ? "412 884 019" : "Mobile number"}
        left={
          <Pressable
            onPress={() => setPicking(true)}
            style={({ pressed }) => [s.code, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Country: ${c.name}, ${dialCode(country)}. Change.`}
          >
            <Txt style={s.flag}>{flag(country)}</Txt>
            <Txt variant="body" color={colors.ink}>{dialCode(country)}</Txt>
            <Feather name="chevron-down" size={14} color={colors.inkFaint} />
            <View style={s.divider} />
          </Pressable>
        }
      />

      {/* mounted only while open, so there is no modal host beside the form */}
      {picking && (
        <CountrySheet
          selected={country}
          onClose={() => setPicking(false)}
          onPick={(code) => { onChangeCountry(code); setPicking(false); }}
        />
      )}
    </>
  );
}

function CountrySheet({
  selected, onPick, onClose,
}: {
  selected: CountryCode;
  onPick: (c: CountryCode) => void;
  onClose: () => void;
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
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
      onRequestClose={onClose}
    >
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
              No match. We list the countries our members use — tell us if yours is missing.
            </Txt>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item.code)}
              style={({ pressed }) => [s.row, pressed && { backgroundColor: colors.surfaceSunk }]}
            >
              <Txt style={s.flag}>{flag(item.code)}</Txt>
              <Txt variant="body" style={{ flex: 1 }}>{item.name}</Txt>
              <Txt variant="body" color={colors.inkMuted}>{dialCode(item.code)}</Txt>
              {item.code === selected && <Feather name="check" size={17} color={colors.accent} />}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  code: { flexDirection: "row", alignItems: "center", gap: 6, paddingRight: space.sm },
  flag: { fontSize: 19 },
  divider: { width: 1, height: 24, marginLeft: space.sm, backgroundColor: colors.line },

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
