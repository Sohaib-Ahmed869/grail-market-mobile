import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useToast } from "./Toast";
import { useSession } from "../lib/session";
import { follow, unfollow, watchlist } from "../lib/watchlist";
import { CardArt, Shimmer } from "./CardArt";
import { Txt } from "./Text";
import { gameTheme, sportIcon } from "../lib/games";
import { gameLogo } from "../lib/gamelogos";
import { money, type Fx } from "../lib/fx";
import type { BrowseGame, SetSummary } from "../lib/cardmarket";
import { colors, fonts, radius, shadow, space } from "../theme";

// The pieces the catalogue is built from: the game grid, the set grid, the
// card grid, and the track that switches between them. Shared by the
// Catalogue tab and a game's own page so the two cannot drift apart — the
// tile you tapped is the tile you see at the top of the next screen.

/** A segmented track: one choice of a few, always all visible.
 *
 *  Filled rather than outlined. A row of grey pills with one slightly less
 *  grey is a row of tags; a solid thumb reads as the control it is. */
export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={s.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[s.seg, on && s.segOn]}
            accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Txt variant="label" color={on ? colors.onPrimary : colors.inkMuted} numberOfLines={1}
              adjustsFontSizeToFit minimumFontScale={0.85} style={{ fontSize: options.length > 4 ? 13 : 13.5 }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Display names that fit a tile. The catalogue's own names are the long
 *  legal ones — "Warhammer Age of Sigmar Champions" — and a tile is two
 *  lines at most. */
const SHORT: Record<string, string> = {
  mtg: "Magic", swu: "Star Wars Unlimited", sorcery: "Sorcery", gatcg: "Grand Archive",
  pokemonjp: "Pokémon Japan", dbsfusion: "Dragon Ball Fusion World", dbsccg: "Dragon Ball Super",
  aoschampions: "Age of Sigmar", vanguard: "Vanguard", shadowverse: "Shadowverse",
};
export const gameName = (g: { id: string; name: string; baseGame?: string; languageName?: string }) => {
  // An edition is named by its base game, with the language as a label
  // beside it — "Pokémon" + "Japanese", not "Pokémon (Japan)" squeezed onto
  // a tile that then truncates the part that matters.
  if (g.languageName) {
    const base = SHORT[g.baseGame ?? ""] ?? g.name.replace(/\s*\((japan|japanese)\)\s*$/i, "");
    return base;
  }
  return SHORT[g.id] ?? g.name;
};

/** "Pokémon · Japanese" — for headers and back-links, where there is room. */
export const editionName = (g: { id: string; name: string; baseGame?: string; languageName?: string }) =>
  g.languageName ? `${gameName(g)} · ${g.languageName}` : gameName(g);

/** A game, as a tile.
 *
 *  Flat navy with the game's mark in the middle — the way a shelf of boxed
 *  games looks, and nothing else on it. The earlier covers stretched a set's
 *  art behind a gradient, which read as decoration rather than as the game.
 *
 *  Three kinds of mark, best first: the publisher's logo when its file is in
 *  the app, a glyph for a sport, and otherwise the name set as a wordmark
 *  over a short rule in the game's own colour. */
export function GameTile({ game, onPress }: { game: BrowseGame; onPress: () => void }) {
  const logo = gameLogo(game.id);
  const icon = sportIcon(game.id);
  const th = gameTheme(game.id);
  const name = gameName(game);
  const size = name.length <= 9 ? 22 : name.length <= 16 ? 18 : 15.5;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.game, pressed && { transform: [{ scale: 0.97 }] }]}
      accessibilityRole="button" accessibilityLabel={name}>
      {logo ? (
        <Image source={logo} style={s.gameLogo} resizeMode="contain" />
      ) : (
        <>
          {icon && <MaterialCommunityIcons name={icon as never} size={30} color={th.tint} style={{ marginBottom: 6 }} />}
          <Txt style={[s.wordmark, { fontSize: size, lineHeight: size * 1.18 }]} numberOfLines={2}>{name}</Txt>
          {game.languageName ? (
            <View style={[s.lang, { backgroundColor: th.tint }]}>
              <Txt style={s.langTxt} numberOfLines={1}>{game.languageName}</Txt>
            </View>
          ) : !icon && <View style={[s.rule, { backgroundColor: th.tint }]} />}
        </>
      )}
      {game.sets ? <Txt style={s.gameMeta}>{game.sets.toLocaleString()} sets</Txt> : null}
    </Pressable>
  );
}

export function GameTileBone() {
  return <View style={[s.game, { overflow: "hidden", backgroundColor: colors.field }]}><Shimmer /></View>;
}

/** A set, as a tile — the same navy block as a game, with the name as type.
 *
 *  Deliberately no picture. The catalogues behind this disagree about what a
 *  set's picture even is: TCGdex sends a logo, One Piece and Lorcana a card,
 *  Magic a black SVG symbol, sports a seller's photograph, and past the
 *  first couple of dozen sets most send nothing. A grid mixing all four read
 *  as broken — "some have logos, some have cards, some nothing". Type is the
 *  one thing every set has, so it is the one thing every tile shows; the
 *  pictures live in the card grid, where every tile really is a card. */
export function SetTile({
  set, fresh, tint, onPress,
}: { set: SetSummary; fresh?: boolean; tint?: string; onPress: () => void }) {
  const year = set.releasedAt ? set.releasedAt.slice(0, 4) : null;
  const facts = set.total > 0
    ? `${set.total.toLocaleString()} cards`
    : set.listed ? `${compact(set.listed)} listed` : null;
  // Sports sets lead with their year ("2023-24 Panini Prizm"), which the
  // corner already shows — printing it twice wastes the tile's best line.
  const title = year ? set.name.replace(new RegExp(`^${year}(-\\d{2,4})?\\s+`), "") || set.name : set.name;
  const size = title.length <= 14 ? 19 : title.length <= 30 ? 16.5 : 14.5;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.set, pressed && { transform: [{ scale: 0.97 }] }]}
      accessibilityRole="button" accessibilityLabel={set.name}>
      <View style={s.setTop}>
        <Txt style={s.setYear}>{year ?? " "}</Txt>
        {fresh && <View style={s.fresh}><Txt style={s.freshTxt}>New</Txt></View>}
      </View>
      <View>
        <View style={[s.rule, { backgroundColor: tint ?? colors.accent, marginTop: 0, marginBottom: 8 }]} />
        <Txt style={[s.setTitle, { fontSize: size, lineHeight: size * 1.2 }]} numberOfLines={3}>{title}</Txt>
        {facts ? <Txt style={s.setMeta} numberOfLines={1}>{facts}</Txt> : null}
      </View>
    </Pressable>
  );
}

export function SetTileBone() {
  return <View style={[s.set, { overflow: "hidden", backgroundColor: colors.field }]}><Shimmer /></View>;
}

/** A sealed product: its photograph large, its name, its set, its price.
 *
 *  Product photos are the one kind of picture every row here really has —
 *  TCGplayer shoots each box the same way on white — so this grid can carry
 *  images without the mixed-logo problem the set tiles had. The price is
 *  TCGplayer's market price for this exact product; absent, it says so in
 *  words rather than printing a zero. */
export function ProductTile({
  name, setName, imageUrl, marketUsd, fx, onPress,
}: {
  name: string; setName: string; imageUrl: string | null; marketUsd: number | null;
  fx: Fx | null; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.98 }] }]}
      accessibilityRole="button" accessibilityLabel={name}>
      <View style={s.productWell}><CardArt uri={imageUrl} resizeMode="contain" iconSize={22} /></View>
      <Txt variant="h3" numberOfLines={2} style={s.productName}>{name}</Txt>
      <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1}>{setName}</Txt>
      <Txt style={[s.productPrice, marketUsd == null && { color: colors.inkFaint, fontFamily: fonts.medium, fontSize: 13 }]}>
        {marketUsd != null ? money(marketUsd, { fx, from: "USD" }) : "No price yet"}
      </Txt>
    </Pressable>
  );
}

/** Follow a card from a list, without opening it.
 *
 *  Sam's point: somebody pricing a hundred cards will not open each one. The
 *  card page's Follow button already does this properly — the watchlist is
 *  read once as catalogue id → watch id, a tap flips the state at once and
 *  only a refusal puts it back — so this is the same logic, shared by every
 *  list that shows a "+".
 *
 *  Signed out, the tap goes to sign-up, exactly like the card page. */
export function useQuickFollow() {
  const session = useSession();
  const router = useRouter();
  const toast = useToast();
  const [watches, setWatches] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let alive = true;
    if (!session) { setWatches(new Map()); return; }
    watchlist().then((r) => {
      if (!alive) return;
      setWatches(new Map(r.watches.filter((w) => w.catalogId).map((w) => [w.catalogId!, w.watchId] as const)));
    });
    return () => { alive = false; };
  }, [session?.userId]);

  const put = (id: string, watch: string | null) =>
    setWatches((m) => {
      const next = new Map(m);
      if (watch) next.set(id, watch); else next.delete(id);
      return next;
    });

  const toggle = useCallback(async (c: {
    cardId: string; name: string; setName?: string | null; number?: string | null; imageUrl?: string | null;
  }) => {
    if (!session) { router.push("/signup"); return; }
    const had = watches.get(c.cardId);
    if (had) {
      put(c.cardId, null);
      if (had === "pending") return;
      const r = await unfollow(had);
      if (!r?.removed) { put(c.cardId, had); toast("Could not unfollow that card.", { tone: "bad" }); }
      return;
    }
    put(c.cardId, "pending");
    const r = await follow({
      catalogId: c.cardId, cardName: c.name, setName: c.setName ?? null,
      cardNumber: c.number ?? null, imageUrl: c.imageUrl ?? null,
      alertPct: 10, alertDir: "any",
    });
    if (r.watchId) {
      put(c.cardId, r.watchId);
      toast(`Following ${c.name}.`, { action: { label: "Watchlist", onPress: () => router.push("/watchlist") } });
    } else {
      put(c.cardId, null);
      toast(r.message ?? "Could not follow that card.", { tone: "bad" });
    }
  }, [session, watches, router, toast]);

  return { isFollowed: (id: string) => watches.has(id), toggle };
}

/** The "+" itself: a small solid button that becomes a tick once followed. */
export function FollowPlus({ on, onPress, size = 28 }: { on: boolean; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}
      style={({ pressed }) => [s.plus, { width: size, height: size, borderRadius: size / 2 }, on && s.plusOn, pressed && { transform: [{ scale: 0.9 }] }]}
      accessibilityRole="button" accessibilityLabel={on ? "Following — tap to unfollow" : "Add to watchlist"}
      accessibilityState={{ selected: on }}>
      <Feather name={on ? "check" : "plus"} size={Math.round(size * 0.55)} color={on ? colors.onPrimary : colors.ink} />
    </Pressable>
  );
}

/** One card in a grid of three.
 *
 *  The price is the catalogue's ungraded figure and is simply absent when
 *  there is none — never a zero, never a dash that looks like a price. */
export function CardCell({
  name, number, imageUrl, rawUsd, fx, onPress, followed, onFollow,
}: {
  name: string; number?: string | null; imageUrl: string | null;
  rawUsd?: number | null; fx: Fx | null; onPress: () => void;
  /** Present to show the "+" watchlist shortcut beside the price. */
  followed?: boolean; onFollow?: () => void;
}) {
  const meta = [
    number ? `#${number}` : null,
    rawUsd != null ? money(rawUsd, { fx, from: "USD" }) : null,
  ].filter(Boolean).join(" · ");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.cell, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={s.cellArt}><CardArt uri={imageUrl} iconSize={16} /></View>
      <Txt variant="label" numberOfLines={1} style={{ marginTop: 6, fontSize: 13 }}>{name}</Txt>
      <View style={s.cellFoot}>
        <Txt variant="bodySmall" color={colors.inkFaint} numberOfLines={1} style={{ fontSize: 12, flex: 1 }}>{meta || " "}</Txt>
        {onFollow && <FollowPlus on={Boolean(followed)} onPress={onFollow} size={22} />}
      </View>
    </Pressable>
  );
}

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();

const s = StyleSheet.create({
  track: {
    flexDirection: "row", padding: 4, gap: 4,
    borderRadius: radius.pill, backgroundColor: colors.field,
  },
  seg: {
    flex: 1, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 2,
  },
  segOn: { backgroundColor: colors.ink },

  game: {
    flex: 1, aspectRatio: 1.45, borderRadius: radius.lg,
    backgroundColor: colors.dark, alignItems: "center", justifyContent: "center",
    paddingHorizontal: space.md, paddingBottom: 8,
    ...shadow.card,
  },
  gameLogo: { width: "80%", height: "56%" },
  wordmark: {
    fontFamily: fonts.bold, color: colors.onDark, textAlign: "center", letterSpacing: -0.3,
  },
  rule: { width: 22, height: 3, borderRadius: 2, marginTop: 8 },
  lang: { marginTop: 7, paddingHorizontal: 9, paddingVertical: 2, borderRadius: radius.pill, maxWidth: "92%" },
  langTxt: { fontFamily: fonts.semi, fontSize: 11.5, color: colors.onDark },
  gameMeta: {
    position: "absolute", bottom: 9, fontFamily: fonts.medium, fontSize: 11.5,
    color: colors.onDarkMuted, fontVariant: ["tabular-nums"],
  },

  set: {
    flex: 1, aspectRatio: 1.08, borderRadius: radius.lg, padding: 14,
    backgroundColor: colors.dark, justifyContent: "space-between", ...shadow.card,
  },
  setTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  setYear: { fontFamily: fonts.medium, fontSize: 12, color: colors.onDarkMuted, fontVariant: ["tabular-nums"] },
  setTitle: { fontFamily: fonts.bold, color: colors.onDark, letterSpacing: -0.2 },
  setMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.onDarkMuted, marginTop: 4 },
  fresh: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.accent,
  },
  freshTxt: { fontFamily: fonts.semi, fontSize: 11, color: colors.dark },

  productWell: {
    aspectRatio: 1, borderRadius: radius.lg, overflow: "hidden", padding: space.md,
    backgroundColor: colors.surface, ...shadow.card,
  },
  productName: { marginTop: space.sm, minHeight: 42 },
  productPrice: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, marginTop: 4, fontVariant: ["tabular-nums"] },
  cell: { flex: 1 },
  cellFoot: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 22 },
  plus: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface, ...shadow.card,
  },
  plusOn: { backgroundColor: colors.ink },
  cellArt: {
    aspectRatio: 63 / 88, borderRadius: 8, overflow: "hidden",
    backgroundColor: colors.surfaceSunk, ...shadow.card,
  },
});
