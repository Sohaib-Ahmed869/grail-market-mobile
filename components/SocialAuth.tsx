import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { Txt } from "./Text";
import { useToast } from "./Toast";
import {
  authMethods, signInWithApple, signInWithGoogle, type Methods, type SocialResult,
} from "../lib/social";
import { colors, radius, space } from "../theme";

/** Google and Apple, only when they will actually work.
 *
 *  The previous version of these was decorative and I removed them, because a
 *  button that does nothing is worse than one that is absent. They are back on
 *  the same terms: the server says which methods it can honour, and a method
 *  it cannot honour is not drawn. That is one request on mount rather than a
 *  build-time flag, so turning a provider on is a deploy and not a release.
 */
export function SocialAuth({ onDone }: { onDone: (r: SocialResult) => void }) {
  const toast = useToast();
  const [methods, setMethods] = useState<Methods | null>(null);
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    let alive = true;
    authMethods().then((m) => { if (alive) setMethods(m); });
    return () => { alive = false; };
  }, []);

  // Nothing at all while we do not know, and nothing at all if neither is on.
  // A row that appears a beat late is better than a row that appears and then
  // vanishes once the answer arrives.
  const apple = Boolean(methods?.apple) && Platform.OS === "ios";
  const google = Boolean(methods?.google);
  if (!methods || (!apple && !google)) return null;

  const run = async (which: "google" | "apple") => {
    setBusy(which);
    const r = which === "google" ? await signInWithGoogle() : await signInWithApple();
    setBusy(null);
    // Backing out of the provider's own sheet is a decision, not a fault.
    // A red toast for it tells somebody off for changing their mind.
    if (r.ok === "cancelled") return;
    if (r.ok === false) { toast(r.message, { tone: "bad" }); return; }
    onDone(r);
  };

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {apple && (
          <SocialButton
            label="Apple"
            busy={busy === "apple"}
            disabled={busy != null}
            onPress={() => run("apple")}
            icon={<AntDesign name="apple" size={18} color={colors.ink} />}
          />
        )}
        {google && (
          <SocialButton
            label="Google"
            busy={busy === "google"}
            disabled={busy != null}
            onPress={() => run("google")}
            icon={<GoogleMark />}
          />
        )}
      </View>

      <View style={s.divider}>
        <View style={s.rule} />
        <Txt variant="bodySmall" color={colors.inkFaint}>or with your email</Txt>
        <View style={s.rule} />
      </View>
    </View>
  );
}

function SocialButton({
  label, icon, onPress, busy, disabled,
}: {
  label: string; icon: React.ReactNode; onPress: () => void;
  busy?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(busy) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.btn, pressed && s.pressed, disabled && !busy && { opacity: 0.5 }]}
    >
      {busy ? <ActivityIndicator color={colors.ink} /> : (
        <>
          {icon}
          <Txt variant="button">{label}</Txt>
        </>
      )}
    </Pressable>
  );
}

/** Google's four colours, drawn rather than imported.
 *
 *  AntDesign's "google" glyph is a single-colour G, and a red one is not
 *  Google's mark — their brand terms are specific about it. Four arcs is
 *  closer to right than a tinted glyph, and costs nothing. */
function GoogleMark() {
  return (
    <View style={s.gWrap}>
      <View style={[s.gArc, { borderTopColor: "#EA4335", borderRightColor: "#4285F4" }]} />
      <View
        style={[
          s.gArc,
          { borderBottomColor: "#34A853", borderLeftColor: "#FBBC05", transform: [{ rotate: "0deg" }] },
        ]}
      />
      <View style={s.gBar} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: space.xl },
  row: { flexDirection: "row", gap: space.sm },
  btn: {
    flex: 1, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: space.sm, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.994 }] },
  divider: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.xl },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
  gWrap: { width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  gArc: {
    position: "absolute", width: 18, height: 18, borderRadius: 9, borderWidth: 3,
    borderTopColor: "transparent", borderRightColor: "transparent",
    borderBottomColor: "transparent", borderLeftColor: "transparent",
  },
  gBar: {
    position: "absolute", right: 0, bottom: 5, width: 8, height: 3,
    backgroundColor: "#4285F4", borderRadius: 1,
  },
});
