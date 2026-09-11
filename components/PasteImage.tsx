import { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Txt } from "./Text";
import { clipboardHasImage, pasteImage } from "../lib/paste";
import { colors, radius, space } from "../theme";

/** Paste whatever picture is on the clipboard.
 *
 *  Renders nothing at all when the clipboard holds no image, because a control
 *  that is usually dead teaches people to stop looking at it. The check runs on
 *  focus — coming back from another app is exactly when something new has been
 *  copied — and asks only whether an image exists, which does not trip the iOS
 *  paste banner the way reading one does.
 *
 *  The caller gets a file:// URI, the same shape the image picker returns, so
 *  every screen that already takes a photo takes a pasted one with no other
 *  change. */
export function PasteImage({
  onPaste,
  label = "Paste",
  style,
}: {
  onPaste: (uri: string) => void;
  label?: string;
  style?: any;
}) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      clipboardHasImage().then((has) => { if (alive) setAvailable(has); });
      return () => { alive = false; };
    }, []),
  );

  if (!available) return null;

  return (
    <Pressable
      onPress={async () => {
        setBusy(true);
        const uri = await pasteImage();
        setBusy(false);
        if (uri) onPaste(uri);
        // Nothing came back: the clipboard changed between the check and the
        // tap, or holds something that is not an image after all. The button
        // simply goes, which is the truth rather than an error.
        else setAvailable(false);
      }}
      disabled={busy}
      accessibilityLabel="Paste the image on your clipboard"
      style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }, style]}
    >
      <Feather name="clipboard" size={15} color={colors.ink} />
      <Txt variant="button">{busy ? "Pasting" : label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingHorizontal: space.lg, height: 44,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface,
  },
});
