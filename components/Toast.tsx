import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { colors, radius, shadow, space } from "../theme";

// Telling someone what just happened.
//
// The Follow button was the case that made this necessary: it worked, it said
// nothing, and there was no way to know from the screen whether the tap had
// registered. An action that changes something on a server and gives no
// answer is indistinguishable from one that failed.
//
// Deliberately not an Alert. A modal for a success takes a second tap to get
// rid of and interrupts what someone was doing; this appears, says the thing,
// and leaves. Alerts are kept for decisions, which are the only things worth
// blocking on.

export type Tone = "good" | "bad" | "info";

type Toast = {
  id: number;
  text: string;
  tone: Tone;
  action?: { label: string; onPress: () => void };
};

type Show = (text: string, opts?: { tone?: Tone; action?: Toast["action"] }) => void;

const Ctx = createContext<Show>(() => {});

/** `const toast = useToast(); toast("Following Charizard")` */
export const useToast = () => useContext(Ctx);

const ICON: Record<Tone, keyof typeof Feather.glyphMap> = {
  good: "check-circle", bad: "alert-triangle", info: "info",
};
const TINT: Record<Tone, string> = {
  good: colors.up, bad: colors.down, info: colors.info,
};

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();
  const next = useRef(0);

  const show: Show = useCallback((text, opts) => {
    const id = ++next.current;
    // Three at once is a stack nobody reads. The oldest goes.
    setItems((cur) => [...cur.slice(-2), { id, text, tone: opts?.tone ?? "good", action: opts?.action }]);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <View
        style={[s.host, { bottom: insets.bottom + 96 }]}
        pointerEvents="box-none"
      >
        {items.map((t) => (
          <Item key={t.id} toast={t} onDone={() => setItems((c) => c.filter((x) => x.id !== t.id))} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function Item({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    // Long enough to read a short sentence, short enough not to sit over the
    // thing it is describing.
    const t = setTimeout(onDone, toast.action ? 5000 : 2800);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      layout={LinearTransition.duration(200)}
      style={[s.toast, shadow.lifted]}
    >
      <Feather name={ICON[toast.tone]} size={16} color={TINT[toast.tone]} />
      <Txt variant="bodySmall" color={colors.onDark} style={{ flex: 1 }} numberOfLines={2}>
        {toast.text}
      </Txt>
      {toast.action && (
        <Pressable onPress={() => { toast.action!.onPress(); onDone(); }} hitSlop={8}>
          <Txt variant="button" color={colors.accent} style={{ fontSize: 13 }}>
            {toast.action.label}
          </Txt>
        </Pressable>
      )}
      <Pressable onPress={onDone} hitSlop={10}>
        <Feather name="x" size={14} color={colors.onDarkMuted} />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  host: {
    position: "absolute", left: 0, right: 0,
    paddingHorizontal: space.lg, gap: space.sm,
  },
  toast: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderRadius: radius.md, backgroundColor: colors.dark,
  },
});
