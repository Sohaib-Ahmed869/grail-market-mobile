import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
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
import { BuyAt } from "../../components/BuyAt";
import { cardMeta, cardPrice, setDetail, type CardPrice } from "../../lib/cardmarket";
import { aud, conversionNote, money as fxMoney, useFx, convert } from "../../lib/fx";
import { gradeLabel, graderById, ladderFor, type GraderId } from "../../lib/grading";
import { PriceChart, RangePicker } from "../../components/PriceChart";
import { CardReveal } from "../../components/CardReveal";
import { CardDeck } from "../../components/CardDeck";
import { SetList, type SetCard } from "../../components/SetList";
import { priceOf } from "../../lib/cardmarket";
import { PrintingPicker } from "../../components/PrintingPicker";
import { CardActions } from "../../components/CardActions";
import { InterestBar } from "../../components/InterestBar";
import { cardCandles, cardInterest, cardTrend, type CardTrend, type Interest } from "../../lib/cards";
import { PeriodStrip } from "../../components/PeriodStrip";
import { MarketChart } from "../../components/MarketChart";
import { CandleChart } from "../../components/CandleChart";
import { Bone } from "../../components/Skeleton";
import { cardHistory, type History } from "../../lib/history";
import { clearDraft, setDraftSeed } from "../../lib/selldraft";
import { follow, unfollow, watchlist } from "../../lib/watchlist";
import { Icon } from "../../components/Icon";
import { useToast } from "../../components/Toast";
import { useSession } from "../../lib/session";
import { colors, radius, shadow, space, type } from "../../theme";

/** A card's page, reached from a set or a search.
 *
 *  Same price chain as a scan, on purpose — a scan and a browse that land on
 *  the same card must not quote two different figures for it. The difference
 *  is that nobody here is holding a slab we have read, so the grade is a
 *  question rather than an answer: pick a company and a grade, and the page
 *  re-prices against that company's own sales. */
export default function CardPage() {
  const { id, set: setParam } = useLocalSearchParams<{ id: string; set?: string }>();
  const router = useRouter();
  const fx = useFx();

  const [fetched, setMeta] = useState<{
    name: string; setName: string; number: string; imageUrl: string | null;
  } | null | undefined>(undefined);
  // The rest of the set, when we came from one. Opened from a set, the card
  // is one of a hand and the hand is what you swipe through; opened from a
  // scan or a link it is on its own, and gets the single flip-in instead.
  // The full catalogue row, not just what the pager draws: the set list
  // below shows a price against each card, and that lives on the same row.
  const [deck, setDeck] = useState<SetCard[] | null>(null);
  const [listing, setListing] = useState(false);
  const [deckSetName, setDeckSetName] = useState<string>("");
  useEffect(() => {
    let alive = true;
    if (!setParam) { setDeck(null); return; }
    setDetail(String(setParam)).then((d) => {
      if (!alive) return;
      setDeck(d?.cards ?? null);
      setDeckSetName(d?.name ?? "");
    });
    return () => { alive = false; };
  }, [setParam]);

  // Opened from a set with no card chosen: the first card of the hand.
  //
  // The set route used to fetch the set itself, pick card one, and only then
  // replace itself with this page — which then fetched the card's metadata
  // and showed a full-screen loader until it came back. Two screens and two
  // round trips before a picture, and a dark band left half-painted in the
  // corner while the second screen slid in. Now the set route hands over at
  // once with `id=first`, and this page names the card as soon as the deck
  // it was going to load anyway has arrived.
  const wantsFirst = String(id) === "first";
  useEffect(() => {
    if (wantsFirst && deck?.[0]) {
      router.setParams({ id: deck[0].cardId, set: String(setParam) } as never);
    }
  }, [wantsFirst, deck, setParam]);

  // What the deck already knows about this card. Enough to draw the page —
  // the name, the number, the picture — while the store is asked for the
  // rest, and a picture for the cards the store has none for: `/market/card`
  // returns imageUrl null for a card it has only a row about, and a follow
  // saved from that had no art on the watchlist.
  const fromDeck = useMemo(() => {
    const c = deck?.find((x) => x.cardId === String(id));
    return c ? { name: c.name, setName: deckSetName, number: c.localId, imageUrl: c.imageUrl } : null;
  }, [deck, deckSetName, id]);
  // MEMOISED, and that is not a nicety.
  //
  // This was an object literal evaluated on every render. The price effect
  // below lists it as a dependency, so: render → effect → `setPrice(undefined)`
  // → render → a NEW meta object, unequal to the last one → effect again,
  // forever. The price block sat in its loading skeleton and flickered,
  // asking the server for the same figure several times a second.
  //
  // The deps are the primitives it is built from, so it changes when the card
  // changes and not when React happens to redraw.
  const meta = useMemo(
    () =>
      fetched
        ? { ...fetched, imageUrl: fetched.imageUrl ?? fromDeck?.imageUrl ?? null }
        : fromDeck ?? (fetched === undefined ? undefined : null),
    [fetched, fromDeck],
  );
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

  // WHICH CARDS ARE FOLLOWED, not whether "the card" is.
  //
  // This was a boolean on the screen. Swiping the deck re-points the URL at
  // the next card and the screen does NOT remount, so the boolean survived
  // the card it described: follow one, swipe, and every card after it said
  // Following. It was also always false on arrival, so a card you already
  // follow offered to follow it again.
  //
  // The watchlist is the answer to both. It is read once when the page
  // opens, kept as catalogue id → watch id, and the button reads whichever
  // card is in the middle. A follow edits the map, so the next swipe back
  // is right without another request.
  const [watches, setWatches] = useState<Map<string, string> | null>(null);
  const [following, setFollowing] = useState(false);
  // Which printing of this collector number the person says they hold. Null
  // until they pick, and cleared whenever the card changes.
  const [printingId, setPrintingId] = useState<number | null>(null);
  useEffect(() => { setPrintingId(null); }, [id]);

  // Once per open, not per swipe. Every card in the set reads the same map.
  useEffect(() => {
    let alive = true;
    if (!session) { setWatches(new Map()); return; }
    watchlist().then((r) => {
      if (!alive) return;
      setWatches(new Map(
        r.watches.filter((w) => w.catalogId).map((w) => [w.catalogId!, w.watchId] as const),
      ));
    });
    return () => { alive = false; };
  }, [session?.userId]);

  const followed = watches?.has(String(id)) ?? false;
  const watchId = watches?.get(String(id)) ?? null;
  const setWatch = (cardId: string, watch: string | null) =>
    setWatches((m) => {
      const next = new Map(m ?? []);
      if (watch) next.set(cardId, watch); else next.delete(cardId);
      return next;
    });
  const toast = useToast();

  // Who this card is. Asked, not worked out.
  //
  // This used to cut the id at its last hyphen and read the front half as a
  // set — right for Pokemon, where `base1-4` really is card 4 of base1, and
  // right for nothing else. A One Piece id is `optcg-OP13-119`, so the cut
  // gave `optcg-OP13` while the set endpoint wants `optcg:OP13` with a colon.
  // The read missed, `meta` went null, and a null meta means the price effect
  // below never fires — so the page rendered with no name and no figure. That
  // was every One Piece card, Portgas D Ace included, which is the first card
  // on the board and so the first one anybody taps.
  //
  // The server answers from what it already stores about the card, which also
  // covers Magic, where the set is not in the id at all and no cut here could
  // ever have found it.
  useEffect(() => {
    let alive = true;
    const raw = String(id);
    if (raw === "first") return;
    // Forget the last card's answer the moment the id changes. A swipe
    // re-points the URL at once and the store answers later, and in between
    // the page was still holding the previous card's name against the new
    // card's id — a Follow tapped in that gap saved "Tropius" with Grubbin's
    // catalogue id. With the deck's own entry filling in immediately, there
    // is nothing to be gained by keeping the stale one.
    setMeta(undefined);
    cardMeta(raw, setParam ? String(setParam) : null).then((m) => {
      if (!alive) return;
      if (m) {
        setMeta({
          name: m.name,
          setName: m.setName ?? "",
          number: m.number ?? "",
          imageUrl: m.imageUrl,
        });
        return;
      }
      // Nothing stored about it — a deep link into a set nobody here has
      // touched. Fall back to reading the set, which is still the Pokemon
      // shape and still correct for it.
      const cut = raw.lastIndexOf("-");
      const setId = cut > 0 ? raw.slice(0, cut) : raw;
      setDetail(setId).then((s) => {
        if (!alive) return;
        const c = s?.cards.find((x) => x.cardId === raw);
        setMeta(c && s
          ? { name: c.name, setName: s.name, number: c.localId, imageUrl: c.imageUrl }
          : null);
      });
    });
    return () => { alive = false; };
  }, [id, setParam]);

  // Keyed on the FIELDS it sends, not on the object holding them. An object
  // dependency is only ever as stable as the identity of that object, and
  // this one is rebuilt from two sources — see the note on `meta`.
  useEffect(() => {
    if (!meta?.name) return;
    let alive = true;
    setPrice(undefined);
    cardPrice({
      cardId: String(id), name: meta.name, setName: meta.setName,
      number: meta.number, grader: grader === "RAW" ? null : grader,
      grade: grader === "RAW" ? null : grade,
    }).then((p) => { if (alive) setPrice(p); });
    return () => { alive = false; };
  }, [id, meta?.name, meta?.setName, meta?.number, grader, grade]);

  const money = (n: number | null | undefined) => fxMoney(n, { fx, from: "USD" });

  const variants = price?.variants ?? [];
  const chosen = variants.find((v) => v.productId === printingId) ?? null;
  // Ambiguous UNTIL they choose. Once a printing is named, that printing's
  // own market price is the answer and nothing is ambiguous about it.
  const unresolved = Boolean(price?.variantsAmbiguous) && !chosen;

  const headline = useMemo(() => {
    if (!price) return null;
    // A named printing outranks every other source: it is the only figure
    // here that is about one physical card rather than about a number that
    // several cards share.
    if (chosen && priceOf(chosen)) return priceOf(chosen)!.usd;
    if (unresolved) return null;
    if (grader === "RAW") return price.rawUsd;
    return price.slabPrice?.price ?? price.sold?.price ?? price.liveAsk?.median ?? null;
  }, [price, grader, chosen, unresolved]);

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
      // AUD, like the listing it seeds. headline is the price chain's figure
      // and that is in US dollars; passing it raw is how a sell screen showed
      // "A$17,421" for a card the page above had just called A$24,184.
      marketValue: convert(headline, { fx, from: "USD" }),
    });
    router.push("/sell/card");
  };

  return (
    <Screen
      back
      footer={
        <CardActions
          followed={followed}
          following={following}
          onSell={sell}
          worth={headline != null ? aud(convert(headline, { fx, from: "USD" })) : null}
          /* Tapped, the button changes at once and the request follows it.
             A follow is a preference, not a payment: waiting on a round trip
             to redraw a button is how a tap comes to feel unregistered, and
             a failure here costs nothing to undo. So the state flips, and
             only a refusal puts it back — with a word about why. */
          onFollow={async () => {
            if (!session) return router.push("/signup");

            // Captured, because a swipe during the round trip must not put
            // the answer on whichever card is in the middle when it lands.
            const card = String(id);
            const name = meta.name;

            if (followed) {
              const had = watchId;
              setWatch(card, null);
              if (!had) return;
              const r = await unfollow(had);
              if (!r?.removed) {
                setWatch(card, had);
                toast("Could not unfollow that card.", { tone: "bad" });
              }
              return;
            }

            setWatch(card, "pending");
            setFollowing(true);
            const r = await follow({
              catalogId: card, cardName: name, setName: meta.setName,
              cardNumber: meta.number, imageUrl: meta.imageUrl,
              grader: grader === "RAW" ? null : grader, grade,
              alertPct: 10, alertDir: "any",
            });
            setFollowing(false);
            if (r.watchId) {
              setWatch(card, r.watchId);
              toast(`Following ${name}. We'll tell you if it moves 10%.`, {
                action: { label: "Watchlist", onPress: () => router.push("/watchlist") },
              });
            } else {
              setWatch(card, null);
              toast(r.message ?? "Could not follow that card.", { tone: "bad" });
            }
          }}
        />
      }
    >
      {deck && deck.length > 1 ? (
        /* Swiping re-points the page at the card in the middle. setParams,
           not push: the URL changes in place and every effect keyed on `id`
           runs again for the new card, and there is no stack of two hundred
           card pages behind the back button. */
        <View style={s.deck}>
          {/* Thumbing through is the default; this is the way to stop
              thumbing and see the whole set at once. It sits with the
              counter because that is where the question "how many, and
              which is the good one" gets asked. */}
          <Pressable
            onPress={() => setListing(true)}
            style={({ pressed }: { pressed: boolean }) => [s.browse, pressed && { opacity: 0.7 }]}
            accessibilityLabel={`See all ${deck.length} cards in this set`}
          >
            <Feather name="list" size={14} color={colors.ink} />
            <Txt variant="label">All {deck.length}</Txt>
          </Pressable>
          <CardDeck
            cards={deck}
            currentId={String(id)}
            onChange={(card) =>
              router.setParams({ id: card.cardId, set: String(setParam) } as never)
            }
          />
        </View>
      ) : (
        <View style={s.hero}>
          <CardReveal uri={meta.imageUrl} width={190} height={264} />
        </View>
      )}

      {deck && deck.length > 1 && (
        <SetList
          visible={listing}
          cards={deck}
          currentId={String(id)}
          setName={meta.setName}
          onClose={() => setListing(false)}
          onPick={(cardId) => router.setParams({ id: cardId, set: String(setParam) } as never)}
        />
      )}

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
      {/* ALWAYS, not only when the feed knows the card.
       *
       *  This block used to be gated on `trend`, so a card the feed has
       *  never heard of showed its name, then a row of grading companies,
       *  then a grade menu, and only under all of that the figure — off the
       *  bottom of the screen. The price is the reason the page was opened.
       *  It goes first, and the controls that change it go under it. */}
      {(
        <View style={s.quote}>
          <Txt variant="overline" color={colors.inkFaint} center>
            {chosen
              ? `${chosen.variant ?? "Base printing"}${priceOf(chosen) ? (priceOf(chosen)!.sold ? " · last sold" : " · asking now") : ""}`
              : unresolved
                ? "Which version is this?"
                : grader === "RAW"
                  ? "Ungraded"
                  : `${graderById(grader)?.mark} ${gradeLabel(grader, grade)}`}
          </Txt>
          {price === undefined ? (
            <Bone h={40} w={140} r={radius.sm} />
          ) : (
            unresolved ? (
              /* A dash, and the question under it. The whole defect this
                 fixes was a confident figure for a card we could not name:
                 A$197 against a market in four figures. No number is a real
                 answer; someone else's number is not. */
              <Txt style={s.quotePrice}>—</Txt>
            ) : (
            <Txt style={s.quotePrice}>
              {/* The feed's figure only where we have none of our own — a
                  price from somewhere is better than no price, and it is the
                  same number the movement below was measured on. */}
              {money(headline ?? trend?.price)}
            </Txt>
            )
          )}
          {/* Percentages are a claim about a series, and until we know which
              printing this is we do not know whose series. Everything the
              feed says goes with the figure it was measured on. */}
          {!unresolved && trend?.change24h != null && (
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

          {trend && !unresolved && (
            <View style={{ alignSelf: "stretch" }}>
              <PeriodStrip
                periods={{
                  day: trend.change24h, week: trend.change7d,
                  month: trend.change30d, quarter: trend.change90d,
                }}
              />
            </View>
          )}

          <View style={s.quoteChart}>
            {unresolved ? null : bars.candles.length > 0 ? (
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
            ) : trend && trend.spark.length > 1 ? (
              <MarketChart
                points={trend.spark}
                height={140}
                label={`${trend.spark.length} readings · coloured by each leg`}
              />
            ) : null}
          </View>
        </View>
      )}

      {/* Which physical card this is, before how it is graded. Grade is a
          question about condition; this is a question about which object is
          in your hand, and answering it in the wrong order prices the wrong
          card very confidently. */}
      <PrintingPicker
        variants={variants}
        selected={printingId}
        onSelect={setPrintingId}
        ambiguous={Boolean(price?.variantsAmbiguous)}
      />

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
            {/* The figure itself is up top now, so this block is the
                evidence under it: where the number came from, how many
                sales, how sure. Printing it again here is the two-figures
                fault this file's header exists to prevent. */}
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

      {/* Where to get one. Above this the page has been answering what the
          card is worth; this is the question that follows it. It sits before
          CardMarket because "buy it here" is a shorter road than the sales
          and ask history underneath. */}
      <BuyAt shops={price?.shops} />

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
  // Full-bleed: the neighbours have to be able to peek in past the page's
  // own gutter, or the "hand of cards" is one card in a box.
  deck: { marginHorizontal: -space.xl, marginTop: space.sm },
  browse: {
    position: "absolute", right: space.xl, top: 0, zIndex: 2,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, height: 34, borderRadius: radius.pill,
    backgroundColor: colors.surface, ...shadow.card,
  },
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
