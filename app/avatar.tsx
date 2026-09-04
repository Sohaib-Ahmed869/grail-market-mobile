import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import { AnimatedAvatar } from "../components/AnimatedAvatar";
import { AVATARS } from "../lib/avatars";
import { chooseAvatar } from "../lib/auth";
import { useSession } from "../lib/session";
import { colors, radius, space } from "../theme";

/** Pick a face.
 *
 *  Twelve drawn options and an opt-out, because the alternative — letting
 *  people upload — is an image host with no moderation attached to a
 *  marketplace where strangers meet in car parks. If someone wants a photo of
 *  themselves on their profile, that is a decision to make deliberately with
 *  a review queue behind it, not a side effect of a settings screen. */
export default function AvatarPicker() {
  const router = useRouter();
  const session = useSession();
  const [picked, setPicked] = useState<string | null>(session?.avatar ?? null);
  const [busy, setBusy] = useState(false);
  // Local and unsaved on purpose: this is a demonstration of what the face
  // does when pressed, not a score anybody keeps.
  const [loved, setLoved] = useState(0);

  const save = async () => {
    setBusy(true);
    const ok = await chooseAvatar(picked);
    setBusy(false);
    if (ok) router.back();
  };

  return (
    <Screen back footer={<Button label={busy ? "Saving" : "Save"} onPress={save} loading={busy} />}>
      <Txt variant="display" style={{ marginTop: space.sm }}>Your Face</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Shown on your posts, your comments and your listings. Change it whenever.
      </Txt>

      <View style={s.preview}>
        {/* The big one breathes and blinks, and presses back. This is the
            screen where somebody is deciding whether they like a face, so it
            is the screen where the face should be doing something. The grid
            below stays still on purpose — twelve of these all bobbing at once
            is a disco, not a picker. */}
        <AnimatedAvatar
          name={session?.name ?? "You"}
          id={picked}
          size={92}
          onHeart={() => setLoved((n) => n + 1)}
          hearted={loved > 0}
          hearts={loved}
          accessibilityLabel="Try this face"
        />
        <Txt variant="h2" style={{ marginTop: space.md }}>{session?.name ?? "You"}</Txt>
        <Txt variant="bodySmall" color={colors.inkFaint}>
          {AVATARS.find((a) => a.id === picked)?.label ?? "Picked from your name"}
        </Txt>
        <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 2 }}>
          {loved > 0 ? "They liked that" : "Tap the face"}
        </Txt>
      </View>

      <View style={s.grid}>
        {AVATARS.map((a) => {
          const on = picked === a.id;
          return (
            <Pressable key={a.id} onPress={() => setPicked(a.id)} style={[s.cell, on && s.cellOn]}>
              <Avatar name={session?.name ?? "You"} id={a.id} size={56} />
              {on && (
                <View style={s.tick}>
                  <Feather name="check" size={11} color={colors.onPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => setPicked(null)} style={s.clear}>
        <Feather name="refresh-cw" size={14} color={colors.inkMuted} />
        <Txt variant="bodySmall" color={colors.inkMuted}>Go back to one picked from my name</Txt>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  preview: {
    alignItems: "center", paddingVertical: space.xl, marginTop: space.lg,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  grid: {
    flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xl,
    justifyContent: "space-between",
  },
  cell: {
    width: "23%", aspectRatio: 1, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, borderWidth: 2, borderColor: "transparent",
  },
  cellOn: { borderColor: colors.ink, backgroundColor: colors.surfaceSunk },
  tick: {
    position: "absolute", right: 6, top: 6,
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center",
  },
  clear: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: space.xl, height: 44,
  },
});
