import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { MoveBars } from "../components/MoveBars";
import { Bone } from "../components/Skeleton";
import { marketPulse, type Pulse } from "../lib/cardmarket";
import { money, useFx } from "../lib/fx";
import { colors, space } from "../theme";

/** Everything that moved, not just the three the dashboard has room for. */
export default function Movers() {
  const router = useRouter();
  const fx = useFx();
  const [pulse, setPulse] = useState<Pulse[] | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      marketPulse().then((p) => { if (alive) setPulse(p); });
      return () => { alive = false; };
    }, []),
  );

  return (
    <Screen back>
      <Txt variant="display">Price Moves</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        The last seven days, biggest movement first.
      </Txt>

      {pulse === undefined ? (
        <View style={{ gap: space.md, marginTop: space.xl }}>
          {[0, 1, 2, 3, 4].map((i) => <Bone key={i} h={54} r={10} />)}
        </View>
      ) : pulse.length === 0 ? (
        <Txt variant="body" color={colors.inkMuted} style={{ marginTop: space.xxl }}>
          Prices held steady this week, or too few cards sold to tell.
        </Txt>
      ) : (
        <View style={{ marginTop: space.lg }}>
          <MoveBars
            rows={pulse.map((p) => ({
              label: p.label,
              meta: [p.setName, money(p.price, { fx, from: "USD" })].filter(Boolean).join(" · "),
              change: p.change7d,
              cardId: p.cardId,
            }))}
            onPress={(r) => r.cardId && router.push(`/card/${r.cardId}` as any)}
          />
        </View>
      )}
    </Screen>
  );
}
