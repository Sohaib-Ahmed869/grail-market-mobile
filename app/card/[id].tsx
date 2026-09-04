import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Loader } from "../../components/Loader";
import { Txt } from "../../components/Text";
import { Button } from "../../components/Button";
import { Note } from "../../components/Note";
import { GraderChips } from "../../components/GraderChips";
import { Picker } from "../../components/Picker";
import { CardMarket } from "../../components/CardMarket";
import { cardPrice, setDetail, type CardPrice } from "../../lib/cardmarket";
import { conversionNote, money as fxMoney, useFx } from "../../lib/fx";
import { gradeLabel, graderById, ladderFor, type GraderId } from "../../lib/grading";
import { PriceChart, RangePicker } from "../../components/PriceChart";
import { CardReveal } from "../../components/CardReveal";
import { InterestBar } from "../../components/InterestBar";
import { cardCandles, cardInterest, cardTrend, type CardTrend, type Interest } from "../../lib/cards";
import { PeriodStrip } from "../../components/PeriodStrip";
import { MarketChart } from "../../components/MarketChart";
import { CandleChart } from "../../components/CandleChart";
import { Bone } from "../../components/Skeleton";
import { cardHistory, type History } from "../../lib/history";
import { clearDraft, setDraftSeed } from "../../lib/selldraft";
import { follow } from "../../lib/watchlist";
import { Icon } from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { useSession } from "../../lib/session";
import { colors, radius, space, type } from "../../theme";

/** A card's page, reached from a set or a search.
 *
 *  Same price chain as a scan, on purpose — a scan and a browse that land on
 *  the same card must not quote two different figures for it. The difference
 *  is that nobody here is holding a slab we have read, so the grade is a
 *  question rather than an answer: pick a company and a grade, and the page
 *  re-prices against that company's own sales. */
export default function CardPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const fx = useFx();

  const [meta, setMeta] = useState<{
    name: string; setName: string; number: string; imageUrl: string | null;
  } | null | undefined>(undefined);
  const [grader, setGrader] = useState<GraderId>("PSA");
  const [grade, setGrade] = useState<string | null>("10");
  const [interest, setInterest] = useState<Interest>({
    following: 0, holding: 0, views: 0, faces: [],
  });
  const [trend, setTrend] = useState<CardTrend | null>(null);
  const [range, setRange] = useState("W");
  const [bars, setBars] = useState<Awaited<ReturnType<typeof cardCandles>>>({
    candles: [], ranges: [], rangeLabels: [], range: "W", ohlc: false, grader: null,
  });
  useEffect(() => {
    let alive = true;
    if (id) cardCandles(String(id), range).then((b) => { if (alive) setBars(b); });
    return () => { alive = false; };
  }, [id, range]);
  // Needs the card's NAME, so it waits for the metadata rather than firing on
  // the id. The feed is queried by name; asking with an empty one is a paid
  // call that cannot match anything.
  useEffect(() => {
    let alive = true;
    if (!id || !meta?.name) return;
    // No game passed: the server infers it from the catalogue id prefix,
    // which is the same thing this screen would be guessing from.
    cardTrend({ cardId: String(id), name: meta.name, setName: meta.setName })
      .then((t) => { if (alive) setTrend(t); });
    return () => { alive = false; };
  }, [id, meta?.name, meta?.setName]);
  useEffect(() => {
    let alive = true;
    if (id) cardInterest(String(id)).then((r) => { if (alive) setInterest(r); });
    return () => { alive = false; };
  }, [id]);
  const [price, setPrice] = useState<CardPrice | null | undefined>(undefined);
  const session = useSession();
  const [followed, setFollowed] = useState(false);
  const [following, setFollowing] = useState(false);
  const toast = useToast();

  // The card id carries its set: "base1-4" is card 4 of base1. Reading the
  // set gives us the name and the artwork without another endpoint.
  useEffect(() => {
    const raw = String(id);
    const cut = raw.lastIndexOf("-");
    const setId = cut > 0 ? raw.slice(0, cut) : raw;
    setDetail(setId).then((s) => {
      const c = s?.cards.find((x) => x.cardId === raw);
      setMeta(c && s
        ? { name: c.name, setName: s.name, number: c.localId, imageUrl: c.imageUrl }
        : null);
    });
  }, [id]);

  useEffect(() => {
    if (!meta) return;
    setPrice(undefined);
    cardPrice({
      cardId: String(id), name: meta.name, setName: meta.setName,
      number: meta.number, grader: grader === "RAW" ? null : grader,
      grade: grader === "RAW" ? null : grade,
    }).then(setPrice);
  }, [meta, grader, grade, id]);

  const money = (n: number | null | undefined) => fxMoney(n, { fx, from: "USD" });

  const headline = useMemo(() => {
    if (!price) return null;
    if (grader === "RAW") return price.rawUsd;
    return price.slabPrice?.price ?? price.sold?.price ?? price.liveAsk?.median ?? null;
  }, [price, grader]);

  const ladder = useMemo(() => {
    const rows = price?.byGrader?.[grader] ?? null;
    if (!rows) return [];
    return Object.entries(rows)
      .map(([g, d]) => ({ grade: g, ...d }))
      .sort((a, b) => Number(a.grade) - Number(b.grade));
  }, [price, grader]);

  if (meta === undefined) {
    return <Screen back><Loader fill /></Screen>;
  }
  if (meta === null) {
    return (
      <Screen back>
        <Txt variant="h2" center style={{ marginTop: space.xxxl }}>Card Not Found</Txt>
        <Txt variant="bodySmall" color={colors.inkMuted} center style={{ marginTop: space.sm }}>
          It may not be in the catalogue yet.
        </Txt>
      </Screen>
    );
  }

  const sell = () => {
    clearDraft();
    setDraftSeed({
      catalogId: String(id), cardName: meta.name, setName: meta.setName,
      cardNumber: meta.number, imageUrl: meta.imageUrl,
      grader: grader === "RAW" ? null : grader, grade,
      marketValue: headline ?? null,
    });
    router.push("/sell/card");
  };

  return (
    <Screen
      back
      footer={
        <>
          <Button label="Sell one of these" onPress={sell} />
          <Button
            label={followed ? "Following · 10% either way" : "Follow this card"}
            kind="ghost"
            icon={
              <Icon
                name="follow"
                size={18}
                filled={followed}
                color={followed ? colors.accent : colors.ink}
              />
            }
            disabled={followed}
            loading={following}
            onPress={async () => {
              if (!session) return router.push("/signup");
              setFollowing(true);
              const r = await follow({
                catalogId: String(id), cardName: meta.name, setName: meta.setName,
                cardNumber: meta.number, imageUrl: meta.imageUrl,
                grader: grader === "RAW" ? null : grader, grade,
                alertPct: 10, alertDir: "any",
              });
              setFollowing(false);
              if (r.watchId) {
                setFollowed(true);
                toast(`Following ${meta.name}. We'll tell you if it moves 10%.`, {
                  action: { label: "Watchlist", onPress: () => router.push("/watchlist") },
                });
              } else {
                toast(r.message ?? "Could not follow that card.", { tone: "bad" });
              }
            }}
          />
        </>
      }
    >
      <View style={s.hero}>
        <CardReveal uri={meta.imageUrl} width={190} height={264} />
      </View>

      <Txt variant="display" center style={{ marginTop: space.lg }}>{meta.name}</Txt>
      <Txt variant="body" color={colors.inkMuted} center>
        {meta.setName} · #{meta.number}
      </Txt>

      {/* The price, the way a quote is shown: the number large, the change
          beside it, the windows under it, the line under those. Everything
          above is what the card IS; this is what it is doing.
       *
       *  The NUMBER is ours and the MOVEMENT is the feed's, which is not a
       *  compromise — it is the only combination that is true. This used to
       *  print `trend.price`, the feed's own figure, while the block further
       *  down printed our price chain for the same card: US$0.20 at the top
       *  and US$8 underneath, forty times apart, because they are two
       *  different sources and the feed had answered about a different
       *  printing. Two figures for one card is the thing this file's header
       *  says must never happen, and when they disagree it is ours that is
       *  built from the grader and grade actually selected.
       *
       *  The percentages stay the feed's. A change over 24 hours is a claim
       *  about a series, and ours is a point. */}
      {trend && (
        <View style={s.quote}>
          <Txt variant="overline" color={colors.inkFaint}>
            {grader === "RAW" ? "Ungraded" : `${graderById(grader)?.mark} ${gradeLabel(grader, grade)}`}
          </Txt>
          {price === undefined ? (
            <Bone h={40} w={140} r={radius.sm} />
          ) : (
            <Txt style={s.quotePrice}>
              {/* The feed's figure only where we have none of our own — a
                  price from somewhere is better than no price, and it is the
                  same number the movement below was measured on. */}
              {money(headline ?? trend.price)}
            </Txt>
          )}
          {trend.change24h != null && (
            <View
              style={[
                s.quotePill,
                { backgroundColor: trend.change24h >= 0 ? colors.upWash : colors.downWash },
              ]}
            >
              <Txt
                variant="button"
                color={trend.change24h >= 0 ? colors.up : colors.down}
              >
                {trend.change24h >= 0 ? "+" : "−"}{Math.abs(trend.change24h).toFixed(2)}%
              </Txt>
            </View>
          )}

          <View style={{ alignSelf: "stretch" }}>
            <PeriodStrip
              periods={{
                day: trend.change24h, week: trend.change7d,
                month: trend.change30d, quarter: trend.change90d,
              }}
            />
          </View>

          <View style={s.quoteChart}>
            {bars.candles.length > 0 ? (
              <CandleChart
                candles={bars.candles}
                ohlc={bars.ohlc}
                ranges={bars.rangeLabels}
                range={bars.range}
                onRange={setRange}
                height={168}
                note={
                  bars.ohlc
                    ? "Each bar opens where the week began and closes where it ended. The wick is the high and the low."
                    : "A daily bar is one reading, so it is drawn as the close rather than a candle."
                }
              />
            ) : trend.spark.length > 1 ? (
              <MarketChart
                points={trend.spark}
                height={140}
                label={`${trend.spark.length} readings · coloured by each leg`}
              />
            ) : null}
          </View>
        </View>
      )}

      <Txt variant="overline" color={colors.inkFaint} style={{ marginTop: space.xl }}>
        Price It As
      </Txt>
      <View style={{ marginTop: space.sm }}>
        <GraderChips value={grader} onChange={(g) => { setGrader(g); setGrade(g === "RAW" ? "NM" : "10"); }} />
      </View>
      <View style={{ marginTop: space.md }}>
        <Picker
          label={grader === "RAW" ? "Condition" : "Grade"}
          value={grade}
          options={ladderFor(grader)}
          onChange={setGrade}
        />
      </View>

      <View style={s.priceBlock}>
        <Txt variant="overline" color={colors.inkFaint}>
          {grader === "RAW" ? "Raw market price" : `${graderById(grader)?.mark} ${gradeLabel(grader, grade)}`}
        </Txt>
        {price === undefined ? (
          <Loader fill />
        ) : (
          <>
            {/* Only when the quote above did not already say it. That block
                renders on a trend and this one always does, so without the
                condition the same figure appears twice a screen apart — and
                with it, a card the feed has never heard of still shows a
                price rather than nothing. */}
            {!trend && <Txt variant="price">{money(headline)}</Txt>}
            {conversionNote(headline, fx) && (
              <Txt variant="bodySmall" color={colors.inkFaint}>{conversionNote(headline, fx)}</Txt>
            )}
            {price?.slabPrice && (
              <Txt variant="bodySmall" color={colors.inkMuted} style={{ marginTop: 4 }}>
                {price.slabPrice.basis === "observed" ? "From completed sales" : price.slabPrice.method}
                {price.slabPrice.sampleSize ? ` · ${price.slabPrice.sampleSize} sales` : ""}
                {" · confidence "}{price.slabPrice.confidence}
              </Txt>
            )}
            {headline == null && (
              <View style={{ marginTop: space.sm }}>
                <Note icon="info">
                  No sale on record at this grade. That is not the same as worthless — it
                  means nobody has sold one recently that we can see.
                </Note>
              </View>
            )}
          </>
        )}
      </View>

      {/* Who else is on this card. Counted from what people actually did —
          see components/InterestBar. */}
      <View style={{ marginTop: space.xl }}>
        <InterestBar interest={interest} />
      </View>

      {grader !== "RAW" && grade && (
        <CardTrend catalogId={String(id)} grader={grader} grade={grade} />
      )}

      {ladder.length > 0 && (
        <View style={{ marginTop: space.xl }}>
          <Txt variant="h2">The {graderById(grader)?.mark} ladder</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginBottom: space.md }}>
            Each grade priced from its own sales. Never converted between companies.
          </Txt>
          <View style={s.ladder}>
            {ladder.map((row) => (
              <View key={row.grade} style={[s.rung, row.grade === grade && s.rungHere]}>
                <Txt variant="h3" style={{ width: 96 }} numberOfLines={1}>
                  {gradeLabel(grader, row.grade) || row.grade}
                </Txt>
                <Txt variant="body" style={{ flex: 1 }}>{money(row.price)}</Txt>
                <Txt variant="bodySmall" color={colors.inkFaint}>
                  {row.count ? `${row.count} sales` : "—"}
                </Txt>
              </View>
            ))}
          </View>
        </View>
      )}

      <CardMarket
        card={{
          cardId: String(id), name: meta.name, setName: meta.setName, number: meta.number,
          grader: grader === "RAW" ? null : grader, grade,
        }}
      />
    </Screen>
  );
}

/** What this exact slab has done over time.
 *
 *  Its own component so the fetch keys off the grader and grade the page is
 *  showing — switching from PSA 10 to BGS 9.5 is a different card as far as
 *  price is concerned, and a chart that did not follow would quietly be
 *  describing something else. */
function CardTrend({
  catalogId, grader, grade,
}: { catalogId: string; grader: string; grade: string }) {
  const [days, setDays] = useState(90);
  const [h, setH] = useState<History | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setH(undefined);
    cardHistory({ catalogId, grader, grade, days }).then((r) => { if (alive) setH(r); });
    return () => { alive = false; };
  }, [catalogId, grader, grade, days]);

  // Nothing at all is the common case for now, and an empty chart frame is
  // worse than no chart — it looks broken rather than new.
  if (h === null) return null;

  const m = h?.movement;
  const up = (m?.change ?? 0) >= 0;

  return (
    <View style={{ marginTop: space.xl }}>
      <View style={s.trendHead}>
        <View style={{ flex: 1 }}>
          <Txt variant="h2">Price Over Time</Txt>
          {m && (
            <Txt variant="bodySmall" color={up ? colors.up : colors.down}>
              {up ? "Up" : "Down"} {Math.abs(m.changePct).toFixed(1)}% over this period
            </Txt>
          )}
        </View>
        <RangePicker value={days} onChange={setDays} />
      </View>

      {h === undefined ? (
        <Bone h={180} r={radius.lg} style={{ marginTop: space.md }} />
      ) : (
        <>
          <PriceChart points={h.points} />
          <Txt variant="bodySmall" color={colors.inkFaint}>
            {/* The distinction that keeps this honest: how many days we drew
                against how many we actually observed. */}
            {h.observed} price{h.observed === 1 ? "" : "s"} recorded
            {h.points.length > h.observed
              ? `, carried forward across ${h.points.length} days`
              : ""}
            . Not a sale history — what the card was worth on each day.
          </Txt>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  trendHead: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  hero: { alignItems: "center", marginTop: space.sm },
  quote: {
    alignItems: "center", marginTop: space.xl, padding: space.lg,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outline,
  },
  quotePrice: { ...type.display, fontSize: 38, lineHeight: 44, letterSpacing: -1, color: colors.ink },
  quotePill: {
    marginTop: 6, paddingHorizontal: space.md, paddingVertical: 4,
    borderRadius: radius.pill,
  },
  quoteChart: { alignSelf: "stretch", marginTop: space.md },
  art: { width: 190, height: 264, borderRadius: radius.md, backgroundColor: colors.surfaceSunk },
  artEmpty: { alignItems: "center", justifyContent: "center" },
  priceBlock: {
    marginTop: space.lg, padding: space.lg, borderRadius: radius.md,
    backgroundColor: colors.surfaceSunk,
  },
  ladder: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  rung: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  rungHere: { backgroundColor: colors.accentWash },
});
