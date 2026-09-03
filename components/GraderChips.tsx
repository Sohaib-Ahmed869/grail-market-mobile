import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Txt } from "./Text";
import { GRADERS, type GraderId } from "../lib/grading";
import { logoFor } from "../lib/graderlogos";
import { colors, radius, shadow, space } from "../theme";

/** The grading companies, as a row of chips.
 *
 *  Set out in full rather than hidden in a dropdown because which company
 *  graded a card is the single biggest thing about it after the card itself —
 *  a BGS 9.5 and a PSA 9.5 are different objects with different prices, and a
 *  seller who has to open a menu to find their company will pick whichever is
 *  already showing.
 *
 *  Each chip carries the company's own wordmark and colour only when selected.
 *  Eight coloured chips at once is a fruit salad; one is a badge. */
export function GraderChips({
  value, onChange, exclude,
}: {
  value: GraderId;
  onChange: (g: GraderId) => void;
  exclude?: GraderId[];
}) {
  const list = GRADERS.filter((g) => !exclude?.includes(g.id));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      style={s.scroll}
    >
      {list.map((g) => {
        const on = g.id === value;
        return (
          <Pressable
            key={g.id}
            onPress={() => onChange(g.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[s.chip, g.id === "RAW" && s.wide, on && s.chipOn]}
          >
            {/* The company's own logo once the file is in assets/graders.
              * Until then a drawn wordmark stands in — never a recoloured
              * version of theirs. Selection is the navy fill behind it, not a
              * different colour of mark: the logo is the brand, and the chip
              * should not be competing with it. */}
            {logoFor(g.id) ? (
              <Image
                source={logoFor(g.id)!}
                style={[s.logo, on && s.logoOn]}
                resizeMode="contain"
              />
            ) : (
              <Txt
                variant="overline"
                color={on ? colors.onPrimary : colors.ink}
                style={[s.mark, { letterSpacing: g.tracking }, g.id === "RAW" && s.markRaw]}
              >
                {g.mark}
              </Txt>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** The same wordmark as a read-only badge, for listings and results. */
export function GraderBadge({ grader, grade }: { grader?: string | null; grade?: string | null }) {
  const g = GRADERS.find((x) => x.id === (grader ?? "").toUpperCase());
  if (!g || g.id === "RAW") {
    return (
      <View style={[s.badge, s.badgeRaw]}>
        <Txt variant="overline" color={colors.inkMuted} style={s.badgeTxt}>RAW</Txt>
      </View>
    );
  }
  const logo = logoFor(g.id);
  return (
    <View style={[s.badge, s.badgeOn]}>
      {logo
        ? <Image source={logo} style={s.badgeLogo} resizeMode="contain" />
        : (
          <Txt variant="overline" color={colors.onPrimary} style={[s.badgeTxt, { letterSpacing: g.tracking * 0.5 }]}>
            {g.mark}
          </Txt>
        )}
      {grade ? (
        <Txt variant="overline" color={colors.onPrimary} style={s.badgeGrade}>{grade}</Txt>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { marginHorizontal: -space.xl },
  row: { paddingHorizontal: space.xl, gap: 6 },
  chip: {
    minWidth: 70, height: 46, paddingHorizontal: space.md,
    alignItems: "center", justifyContent: "center",
    borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.fieldLine,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink, ...shadow.card },
  logo: { width: 54, height: 22 },
  // A dark chip needs a light mark. Most of these logos are dark on
  // transparent, so they are inverted rather than recoloured.
  logoOn: { tintColor: colors.onPrimary },
  wide: { minWidth: 82 },
  mark: { fontSize: 11.5, fontWeight: "700" },
  markRaw: { letterSpacing: 0.2, textTransform: "none" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, alignSelf: "flex-start",
  },
  badgeOn: { backgroundColor: colors.ink },
  badgeRaw: { backgroundColor: colors.surfaceSunk, borderWidth: 1, borderColor: colors.line },
  badgeTxt: { fontSize: 11, letterSpacing: 0.1 },
  badgeLogo: { width: 34, height: 11, tintColor: colors.onPrimary },
  badgeGrade: { fontSize: 11, letterSpacing: 0.1 },
});
