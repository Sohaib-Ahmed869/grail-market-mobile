import { useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PageWash } from "../../components/PageWash";
import { colors } from "../../theme";

/** A set, opened straight onto its cards.
 *
 *  The route stays because deep links and the back stack know it, but it is
 *  a hand-over, not a page: it replaces itself with the card page at once,
 *  asking for the set's first card by name rather than by id, and the card
 *  page names that card the moment the set it loads anyway has arrived.
 *  The version before this fetched the set here first, then replaced
 *  itself, then the card page fetched again and sat on a full-screen loader
 *  — two screens and three round trips before a picture. */
export default function SetScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace({ pathname: "/card/[id]", params: { id: "first", set: String(setId) } } as never);
  }, [setId]);
  return <View style={{ flex: 1, backgroundColor: colors.washBottom }}><PageWash /></View>;
}
