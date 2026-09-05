import { useEffect, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Loader } from "./Loader";
import { Txt } from "./Text";
import { Note } from "./Note";
import { GraderBadge } from "./GraderChips";
import { availableNow, confirmedSales, liveAsks, type LiveAsks, type SalesAnswer } from "../lib/cardmarket";
import { num, type Listing } from "../lib/market";
import { conversionNote, money, useFx } from "../lib/fx";
import { colors, radius, space } from "../theme";

const day = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
};

const ago = (days: number | null | undefined) =>
  days == null ? "" : days <= 0 ? "today" : days === 1 ? "1 day" : days < 60 ? `${days} days` : `${Math.round(days / 30)} months`;

export type CardRef = {
  cardId?: string | null; name: string; setName?: string | null; number?: string | null;
  game?: string | null; grader?: string | null; grade?: string | null; printing?: string | null;
};

/** The market around one card: sales, asks, and what is for sale here.
 *
 *  Three different kinds of evidence, kept apart on purpose. A completed sale
 *  is what someone paid; an asking price is what someone hopes for; a listing
 *  on our own market is neither until it sells. Stacking them into one average
 *  is how a card ends up "worth" the most optimistic number on the page.
 *
 *  Loaded after the screen paints, because none of it should hold up the
 *  figure people are waiting for. */
export function CardMarket({ card }: { card: CardRef }) {
  const router = useRouter();
  const fx = useFx();
  const [asks, setAsks] = useState<LiveAsks | null | undefined>(undefined);
  const [sales, setSales] = useState<SalesAnswer | null | undefined>(undefined);
  const [ours, setOurs] = useState<Listing[]>([]);

  useEffect(() => {
    let alive = true;
    liveAsks({
      name: card.name, setName: card.setName, number: card.number,
      grader: card.grader, grade: card.grade, game: card.game, printing: card.printing,
    }).then((r) => { if (alive) setAsks(r); });

    if (card.cardId) {
      confirmedSales({
        cardId: card.cardId, grader: card.grader, grade: card.grade,
        name: card.name, setName: card.setName, number: card.number,
      }).then((r) => { if (alive) setSales(r); });
      availableNow(card.cardId).then((r) => { if (alive) setOurs(r); });
    } else {
      setSales(null);
    }
    return () => { alive = false; };
  }, [card.cardId, card.name, card.grader, card.grade]);

  const aud = (n: number | null | undefined, from = "USD") => money(n, { fx, from });

  return (
    <View>
      {/* ---- completed sales -------------------------------------------- */}
      <Txt variant="h2" style={{ marginTop: space.xxl }}>Confirmed Sales</Txt>
      <Txt variant="bodySmall" color={colors.inkFaint}>
        What people actually paid, most recent first.
      </Txt>

      {sales === undefined ? (
        <Loader size={34} />
      ) : sales && sales.sales.length > 0 ? (
        <View style={s.group}>
          {sales.sales.map((sale) => (
            <Pressable
              key={sale.sale_id}
              disabled={!sale.source_url?.startsWith("http")}
              onPress={() => sale.source_url && Linking.openURL(sale.source_url)}
              style={s.saleRow}
            >
              <GraderBadge grader={sale.grader ?? "RAW"} grade={sale.grade} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{aud(Number(sale.price), sale.currency || "USD")}</Txt>
                <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>
                  {day(sale.sold_at)} · {sale.source}
                </Txt>
              </View>
              {sale.source_url?.startsWith("http") && (
                <Feather name="external-link" size={14} color={colors.inkFaint} />
              )}
            </Pressable>
          ))}
          {sales.note && (
            <View style={{ padding: space.md }}>
              <Txt variant="bodySmall" color={colors.inkFaint}>{sales.note}</Txt>
            </View>
          )}
        </View>
      ) : sales?.known && sales.known > 0 ? (
        /* We have the sales, we just cannot list them one by one. Saying "no
           sale on record" here flatly contradicted the valuation above, which
           was computed from exactly these. Show what they add up to. */
        <View style={s.group}>
          <View style={s.saleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3">
                {sales.known} completed sale{sales.known === 1 ? "" : "s"} at this grade
              </Txt>
              {sales.aggregate?.median != null && (
                <Txt variant="bodySmall" color={colors.inkMuted}>
                  Middle price {aud(sales.aggregate.median, "USD")}
                  {sales.aggregate.low != null && sales.aggregate.high != null
                    ? ` · ranged ${aud(sales.aggregate.low, "USD")} to ${aud(sales.aggregate.high, "USD")}`
                    : ""}
                </Txt>
              )}
              {sales.lastSaleAt && (
                <Txt variant="bodySmall" color={colors.inkFaint}>
                  Last one sold {day(sales.lastSaleAt)}
                </Txt>
              )}
            </View>
          </View>
          <View style={{ padding: space.md }}>
            <Txt variant="bodySmall" color={colors.inkFaint}>
              {sales.note ??
                "Our price source reports totals rather than individual sales, so we can show what they add up to but not list them one by one."}
            </Txt>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: space.md }}>
          <Note icon="info">
            {sales === null
              ? "This server build can't itemise sales yet — the figure above still comes from completed sales, we just can't list them row by row here."
              : "No sale on record for this exact card and grade."}
          </Note>
        </View>
      )}

      {/* ---- asking prices ---------------------------------------------- */}
      <Txt variant="h2" style={{ marginTop: space.xxl }}>Asking Now</Txt>
      <Txt variant="bodySmall" color={colors.inkFaint}>
        Live listings elsewhere. Asking prices, not sales.
      </Txt>

      {asks === undefined ? (
        <Loader size={34} />
      ) : asks && asks.listings.length > 0 ? (
        <>
          <View style={s.stats}>
            {/* Only a median when it IS one. Once the stale ceiling has pulled
                it down to the cheapest long-unsold ask, "Median ask" over a
                figure below every other listing on the page is simply false. */}
            <Stat
              label={asks.cappedByStale ? "Ceiling" : "Median ask"}
              value={aud(asks.medianAsk)}
              strong
            />
            <Stat label="Lowest" value={aud(asks.askLow)} />
            <Stat label="Highest" value={aud(asks.askHigh)} />
          </View>
          <Txt variant="bodySmall" color={colors.inkFaint} style={{ marginTop: 6 }}>
            {asks.matched} of {asks.total} listings matched this card
            {asks.filteredToGrade && card.grader ? ` at ${card.grader} ${card.grade ?? ""}` : ""}
            {asks.trimmed ? ` · ${asks.trimmed} outliers set aside` : ""}
            {conversionNote(asks.medianAsk, fx) ? ` · ${conversionNote(asks.medianAsk, fx)}` : ""}
          </Txt>
          {asks.cappedByStale && asks.staleCeilingDays != null && (
            <View style={{ marginTop: space.sm }}>
              <Note tone="accent" icon="clock">
                This is the cheapest ask still standing after{" "}
                {Math.round(asks.staleCeilingDays / 30)} months unsold, so it caps the
                market rather than describing it. Nobody paid this — somebody failed to get it.
              </Note>
            </View>
          )}

          <View style={s.group}>
            {asks.listings.slice(0, 6).map((l) => (
              <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={s.askRow}>
                {l.imageUrl ? (
                  <Image source={{ uri: l.imageUrl }} style={s.thumb} resizeMode="cover" />
                ) : (
                  <View style={[s.thumb, s.thumbEmpty]}>
                    <Feather name="image" size={14} color={colors.inkFaint} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  {/* The company is on the row, not only in the filter. Two
                    * listings at the same price are different objects when one
                    * is a BGS 9.5 and the other a PSA 9, and a reader
                    * scanning prices has no way to see that otherwise. */}
                  <GraderBadge
                    grader={l.grader ?? "RAW"}
                    grade={l.grade != null ? String(l.grade) : null}
                  />
                  <Txt variant="bodySmall" numberOfLines={2}>{l.title}</Txt>
                  <Txt variant="overline" color={colors.inkFaint}>
                    {l.seller ?? "seller"}
                    {l.sellerFeedbackPct != null ? ` · ${l.sellerFeedbackPct}%` : ""}
                    {l.sellerFeedbackCount != null ? ` (${l.sellerFeedbackCount})` : ""}
                    {l.ageDays != null ? ` · listed ${ago(l.ageDays)} ago` : ""}
                  </Txt>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Txt variant="h3">{aud(l.price, l.currency || "USD")}</Txt>
                  {l.bestOffer && (
                    <Txt variant="overline" color={colors.inkFaint}>offers</Txt>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={{ marginTop: space.md }}>
          <Note icon="info">
            Nothing listed for this card right now — which for a scarce card is normal,
            and is itself worth knowing before you price yours.
          </Note>
        </View>
      )}

      {/* ---- our own market --------------------------------------------- */}
      {ours.length > 0 && (
        <>
          <Txt variant="h2" style={{ marginTop: space.xxl }}>Available On GrailMarket</Txt>
          <Txt variant="bodySmall" color={colors.inkFaint}>
            Verified sellers, checked before going live.
          </Txt>
          <View style={s.group}>
            {ours.map((l) => (
              <Pressable
                key={l.listing_id}
                onPress={() => router.push(`/listing/${l.listing_id}` as any)}
                style={s.askRow}
              >
                {l.photos?.[0]?.url || l.image_url ? (
                  <Image source={{ uri: l.photos?.[0]?.url ?? l.image_url! }} style={s.thumb} resizeMode="cover" />
                ) : (
                  <View style={[s.thumb, s.thumbEmpty]}>
                    <Feather name="image" size={14} color={colors.inkFaint} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <GraderBadge grader={l.grader ?? "RAW"} grade={l.grade} />
                  <Txt variant="bodySmall" numberOfLines={1}>{l.card_name}</Txt>
                  {l.photo_verified && (
                    <Txt variant="overline" color={colors.up}>Photo verified</Txt>
                  )}
                </View>
                <Txt variant="h3">
                  {money(num(l.price), { fx, from: l.currency || "AUD" })}
                </Txt>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt variant="overline" color={colors.inkFaint}>{label}</Txt>
      <Txt variant={strong ? "h2" : "h3"} color={strong ? colors.ink : colors.inkMuted}>{value}</Txt>
    </View>
  );
}

const s = StyleSheet.create({
  group: {
    marginTop: space.md, borderRadius: radius.lg, overflow: "hidden",
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  saleRow: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  askRow: {
    flexDirection: "row", alignItems: "center", gap: space.md,
    padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  thumb: { width: 38, height: 52, borderRadius: 4, backgroundColor: colors.surfaceSunk },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  stats: {
    flexDirection: "row", gap: space.md, marginTop: space.md, padding: space.lg,
    borderRadius: radius.md, backgroundColor: colors.surfaceSunk,
  },
});
