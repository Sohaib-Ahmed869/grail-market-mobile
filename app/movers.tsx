import { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "../components/Screen";
import { Txt } from "../components/Text";
import { MoveBars } from "../components/MoveBars";
import { TrendCompare } from "../components/TrendCompare";
import { Bone } from "../components/Skeleton";
import { marketPulse, type Pulse } from "../lib/cardmarket";
import { money, useFx } from "../lib/fx";
import { StyleSheet } from "react-native";
import { colors, radius, space } from "../theme";

/** Everything that moved, not just the three the dashboard has room for. */
export default function Movers() {
  const router = useRouter();
  const fx = useFx();
  const [pulse, setPulse] = useState<Pulse[] | undefined>(undefined);
  const [focus, setFocus] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      marketPulse().then((p) => { if (alive) setPulse(p); });
      return () => { alive = false; };
    }, []),
  );

  return (
    <Screen back>
      <Txt variant="display">On The Move</Txt>
      <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
        Biggest movement first, ranked on the week. Refreshed twice a day.
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
          <View style={s.compare}>
            <TrendCompare
              series={pulse.slice(0, 8).map((p) => ({
                id: p.cardId ?? p.label,
                label: p.label,
                points: p.spark ?? [],
              }))}
              selectedId={focus ?? pulse[0]?.cardId ?? pulse[0]?.label}
              onSelect={setFocus}
              height={200}
            />
          </View>

          <MoveBars
            rows={pulse.map((p) => ({
              label: p.label,
              meta: [p.setName, money(p.price, { fx, from: "USD" })].filter(Boolean).join(" · "),
              change: p.change7d,
              cardId: p.cardId,
              // Only here. The dashboard shows three rows as a glance; this
              // screen is what somebody opened to actually look.
              periods: {
                day: p.change24h, week: p.change7d,
                month: p.change30d, quarter: p.change90d,
              },
            }))}
            onPress={(r) =>
              r.cardId
                ? router.push(`/card/${r.cardId}` as any)
                : router.push({ pathname: "/market", params: { q: r.label } })
            }
          />
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  compare: {
    padding: space.lg, marginBottom: space.lg,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outline,
  },
});
