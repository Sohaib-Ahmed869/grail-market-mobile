import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { Note } from "../components/Note";
import { colors, radius, space, type } from "../theme";

const LENGTH = 6;
const RESEND_SECONDS = 24;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/** SMS code.
 *
 *  Level 1, and the screen says so — proving a phone number saves a collection
 *  and nothing else. Keeping that explicit here is what stops someone reaching
 *  the sell flow believing they are already cleared to trade.
 *
 *  The keypad is drawn rather than delegated to the system keyboard: it keeps
 *  the digits in a fixed place across both platforms and leaves room to show
 *  the resend timer without the layout jumping. */
export default function SmsCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (code.length === LENGTH) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const t = setTimeout(() => router.push("/ladder"), 260);
      return () => clearTimeout(t);
    }
  }, [code, router]);

  const press = (k: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (k === "del") setCode((c) => c.slice(0, -1));
    else if (k) setCode((c) => (c.length < LENGTH ? c + k : c));
  };

  const timer = useMemo(
    () => `0:${String(left).padStart(2, "0")}`,
    [left],
  );

  return (
    <Screen back scroll={false}>
      <Txt variant="display">Enter your code</Txt>
      <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.sm }}>
        We sent a six digit code to{" "}
        <Txt variant="body" color={colors.ink} style={{ fontWeight: "600" }}>0412 884 019</Txt>.
      </Txt>

      <View style={s.cells}>
        {Array.from({ length: LENGTH }).map((_, i) => {
          const filled = i < code.length;
          const active = i === code.length;
          return (
            <View key={i} style={[s.cell, active && s.cellActive, filled && s.cellFilled]}>
              <Txt variant="h1">{code[i] ?? ""}</Txt>
            </View>
          );
        })}
      </View>

      <View style={s.resend}>
        {left > 0 ? (
          <Txt variant="bodySmall" color={colors.inkFaint}>
            Didn&rsquo;t arrive? Resend in {timer}
          </Txt>
        ) : (
          <Pressable onPress={() => setLeft(RESEND_SECONDS)} hitSlop={10} accessibilityRole="button">
            <Txt variant="bodySmall" color={colors.ink} style={{ textDecorationLine: "underline" }}>
              Send it again
            </Txt>
          </Pressable>
        )}
      </View>

      <View style={s.pad}>
        {KEYS.map((k, i) =>
          k === "" ? (
            <View key={i} style={s.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => press(k)}
              accessibilityRole="button"
              accessibilityLabel={k === "del" ? "Delete" : k}
              style={s.key}
            >
              {({ pressed }) => (
                <View style={[s.keyFace, pressed && s.keyPressed]}>
                  {k === "del" ? (
                    <Feather name="delete" size={19} color={colors.ink} />
                  ) : (
                    <Txt style={type.h1}>{k}</Txt>
                  )}
                </View>
              )}
            </Pressable>
          ),
        )}
      </View>

      <Note icon="info">
        This is level one. It proves the number is yours and lets you save a collection —
        not buy or sell.
      </Note>
    </Screen>
  );
}

const s = StyleSheet.create({
  cells: { flexDirection: "row", gap: space.sm, marginTop: space.xxl },
  cell: {
    flex: 1, aspectRatio: 0.82, maxHeight: 62,
    alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.line, backgroundColor: colors.surfaceSunk,
  },
  cellFilled: { borderColor: colors.lineStrong, backgroundColor: colors.surface },
  cellActive: { borderColor: colors.ink, backgroundColor: colors.surface },
  resend: { alignItems: "center", marginTop: space.lg },
  pad: { flexDirection: "row", flexWrap: "wrap", marginTop: space.xl, marginHorizontal: -space.xs },
  key: { width: "33.333%", height: 58, padding: space.xs },
  keyFace: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
    borderWidth: 1, borderColor: colors.line,
  },
  keyPressed: { backgroundColor: colors.line },
});
