import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Txt } from "./Text";
import { Icon } from "./Icon";
import { colors, radius, space } from "../theme";

export const EMOJI = ["👍", "👌", "🔥", "😂", "🤝"] as const;
export type Reaction = { emoji: string; userId: string };

/** Reactions on anything.
 *
 *  Used by posts, comments and messages so all three behave identically —
 *  before this each screen was going to grow its own, and a reaction that
 *  works differently in the forum than in a chat is a small betrayal every
 *  time someone tries it.
 *
 *  Always shows an add button rather than hiding behind a long-press. A
 *  gesture nobody can see is a feature nobody has: that is exactly why the
 *  message reactions went unnoticed until they were pointed out. */
export function Reactions({
  reactions, mine, onPick, compact = false,
}: {
  reactions: Reaction[];
  /** the signed-in user, so their own reaction can be marked */
  mine?: string | null;
  onPick: (emoji: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const counts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});
  const own = mine ? reactions.find((r) => r.userId === mine)?.emoji : undefined;

  return (
    <View style={s.wrap}>
      {Object.entries(counts).map(([emoji, n]) => (
        <Pressable
          key={emoji}
          onPress={() => onPick(emoji)}
          style={[s.chip, own === emoji && s.chipMine]}
        >
          <Txt variant="bodySmall">{emoji}</Txt>
          {n > 1 && (
            <Txt variant="bodySmall" color={own === emoji ? colors.ink : colors.inkMuted}>
              {n}
            </Txt>
          )}
        </Pressable>
      ))}

      <Pressable onPress={() => setOpen((o) => !o)} style={[s.chip, s.add]} hitSlop={6}>
        <Icon name="star" size={compact ? 12 : 13} color={colors.inkFaint} />
        {!compact && reactions.length === 0 && (
          <Txt variant="bodySmall" color={colors.inkFaint}>React</Txt>
        )}
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(140)} style={s.picker}>
          {EMOJI.map((e) => (
            <Pressable
              key={e}
              onPress={() => { setOpen(false); onPick(e); }}
              hitSlop={4}
              style={[s.pick, own === e && s.pickOn]}
            >
              <Txt variant="h2">{e}</Txt>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  chipMine: { borderColor: colors.ink, backgroundColor: colors.surfaceSunk },
  add: { borderStyle: "dashed", borderColor: colors.lineStrong },
  picker: {
    flexDirection: "row", gap: space.sm,
    paddingHorizontal: space.md, paddingVertical: 6, marginLeft: 2,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
    shadowColor: "#0B1622", shadowOpacity: 0.12, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  pick: { paddingHorizontal: 2, borderRadius: radius.sm },
  pickOn: { backgroundColor: colors.surfaceSunk },
});
