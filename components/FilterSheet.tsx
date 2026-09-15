import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { colors, radius, space } from "../theme";

/** The filter sheet, drawn once.
 *
 *  The sheet this replaces was a wrap of pills under each heading — sixty-two
 *  game names as sixty-two tags, and nothing to say which of them was a sort
 *  and which a narrowing. Every shop app people already use answers that the
 *  same way: a full sheet, one group per question, each group closed onto
 *  its current value, radio rows inside, and one button at the bottom that
 *  says how many results you are about to get. This is that.
 *
 *  Only the frame lives here. What the groups are is the screen's business,
 *  because the catalogue, a game and a search result each filter on
 *  different things.
 */
export function FilterSheet({
  visible, onClose, onReset, canReset, applyLabel, children,
}: {
  visible: boolean;
  onClose: () => void;
  onReset: () => void;
  /** Reset is always drawn, and greyed when there is nothing to undo. A
   *  control that appears and disappears is one people stop reaching for. */
  canReset: boolean;
  applyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.root} edges={["bottom"]}>
        <View style={s.head}>
          <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => [s.close, pressed && { opacity: 0.6 }]}
            accessibilityLabel="Close filters">
            <Feather name="x" size={18} color={colors.ink} />
          </Pressable>
          <Txt variant="h3" style={s.title}>Filters</Txt>
          <Pressable onPress={onReset} hitSlop={10} disabled={!canReset} style={s.reset}>
            <Txt variant="label" color={canReset ? colors.ink : colors.inkFaint}>Reset</Txt>
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        <View style={s.foot}>
          <Pressable onPress={onClose} style={({ pressed }) => [s.apply, pressed && { transform: [{ scale: 0.99 }], opacity: 0.92 }]}
            accessibilityRole="button">
            <Txt variant="button" color={colors.onPrimary}>{applyLabel}</Txt>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/** One question in the sheet.
 *
 *  Closed, it shows its answer under its name — "Categories / Sports" — so the
 *  whole state of the sheet reads down one column without opening anything.
 *  Open, it hides that line, because the selected radio is saying it. */
export function FilterGroup({
  title, value, open, onToggle, children,
}: {
  title: string;
  value?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={s.group}>
      <Pressable onPress={onToggle} style={s.groupHead} accessibilityRole="button"
        accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="h3" style={{ fontSize: 17 }}>{title}</Txt>
          {!open && value ? (
            <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1} style={{ marginTop: 2 }}>{value}</Txt>
          ) : null}
        </View>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={20} color={colors.ink} />
      </Pressable>
      {open && <View style={s.groupBody}>{children}</View>}
    </View>
  );
}

/** A single choice. The whole row is the target, not just the circle. */
export function RadioRow({
  label, on, onPress, count, leading,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  /** How many results this choice leaves. Shown quietly, and only where the
   *  screen actually knows it — a guessed count is worse than none. */
  count?: number;
  leading?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
      accessibilityRole="radio" accessibilityState={{ checked: on }}>
      {leading}
      <Txt variant="body" style={{ flex: 1, fontSize: 16.5 }} numberOfLines={1}>{label}</Txt>
      {count != null && <Txt variant="bodySmall" color={colors.inkFaint} style={s.count}>{count}</Txt>}
      <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
    </Pressable>
  );
}

/** What is applied, in the page rather than hidden in the sheet.
 *
 *  Each filter is a dark pill with its own clear, so undoing one is a tap on
 *  the thing itself instead of a trip back into the sheet. */
export function ActiveBar({
  count, pills, onOpen,
}: {
  count: string | null;
  pills: (false | null | undefined | "" | { label: string; clear: () => void })[];
  onOpen: () => void;
}) {
  const on = pills.filter(Boolean) as { label: string; clear: () => void }[];
  return (
    <View style={s.active}>
      <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginRight: 2 }}>{count ?? " "}</Txt>
      {on.map((p) => (
        <Pressable key={p.label} onPress={p.clear} style={({ pressed }) => [s.pill, pressed && { opacity: 0.8 }]}
          accessibilityLabel={`Remove ${p.label}`}>
          <Txt variant="label" color={colors.onPrimary} numberOfLines={1} style={{ fontSize: 12.5, maxWidth: 150 }}>{p.label}</Txt>
          <Feather name="x" size={12} color={colors.onPrimary} />
        </Pressable>
      ))}
      {on.length === 0 && (
        <Pressable onPress={onOpen} hitSlop={8} style={s.sortLink}>
          <Txt variant="label" color={colors.ink} style={{ fontSize: 12.5 }}>Sort & filter</Txt>
          <Feather name="chevron-down" size={13} color={colors.ink} />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  head: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  close: {
    width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.field,
  },
  title: { flex: 1, textAlign: "center", fontSize: 17 },
  reset: { minWidth: 34, alignItems: "flex-end" },
  body: { paddingHorizontal: space.xl, paddingBottom: space.xl },

  group: { borderBottomWidth: 1, borderBottomColor: colors.line },
  groupHead: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 18 },
  groupBody: { paddingBottom: space.md },

  row: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52 },
  count: { fontVariant: ["tabular-nums"] },
  radio: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.outline,
    alignItems: "center", justifyContent: "center",
  },
  radioOn: { borderWidth: 0, backgroundColor: colors.ink },
  active: {
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6,
    marginTop: space.md, marginBottom: space.lg, minHeight: 28,
  },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingLeft: 11, paddingRight: 9, height: 28, borderRadius: radius.pill, backgroundColor: colors.ink,
  },
  sortLink: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.surface },

  foot: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.sm },
  apply: {
    height: 56, borderRadius: radius.pill, backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center",
  },
});
