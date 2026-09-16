import { useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "./Text";
import { CardArt, Shimmer } from "./CardArt";
import { dollars, lens, lh } from "./MarketLens";
import { gameTheme, sportIcon, sportOf } from "../lib/games";
import { aud, convert, money, type Fx } from "../lib/fx";
import type { SetSummary } from "../lib/cardmarket";
import { fonts } from "../theme";

// The browsing pieces from the "Pearl" design the client supplied on
// 2026-09-15: tinted glass panels with real card art, a sculpted two-way
// segment, and a card tile that leads with its raw price. Browse, a game's
// sets and a set's cards are built from these, so a panel tapped on one
// screen is the panel at the top of the next.

/** Panel washes, sampled from the design: sand, sea glass, sage, lavender and
 *  blush. Each is a soft diagonal with a brighter glow in the top corner. */
export const TONES = {
  sand:     { base: ["#E9DECA", "#EFE9DE"] as const, glow: "rgba(210,185,146,0.85)", line: "#C8B695" },
  sea:      { base: ["#D3DFE3", "#E6E8E0"] as const, glow: "rgba(173,191,198,0.95)", line: "#A7B6BE" },
  sage:     { base: ["#DCE8E2", "#ECF0EA"] as const, glow: "rgba(163,210,203,0.8)", line: "#A9C2BA" },
  lavender: { base: ["#E4E3F0", "#EFEEF4"] as const, glow: "rgba(196,198,224,0.95)", line: "#B9B8D0" },
  blush:    { base: ["#EFE0DD", "#F2EBE7"] as const, glow: "rgba(224,202,203,0.95)", line: "#CDB5B2" },
} as const;
export type Tone = keyof typeof TONES;

const TONE_ORDER: Tone[] = ["sand", "sea", "sage", "lavender", "blush"];
const FIXED_TONE: Record<string, Tone> = {
  pokemon: "sand", pokemonjp: "sand", mtg: "sage", onepiece: "blush", yugioh: "lavender", lorcana: "sea",
};

/** A tone per game that stays put between visits: the big games keep the
 *  design's own pairing, sports sit in sea glass, language editions in
 *  lavender, and everything else is spread across the five by its id. */
export function toneFor(gameId: string): Tone {
  if (FIXED_TONE[gameId]) return FIXED_TONE[gameId]!;
  if (sportOf(gameId)) return "sea";
  if (/^lang:/.test(gameId)) return "lavender";
  let h = 0;
  for (let i = 0; i < gameId.length; i++) h = (h * 31 + gameId.charCodeAt(i)) >>> 0;
  return TONE_ORDER[h % TONE_ORDER.length]!;
}

function Wash({ tone }: { tone: Tone }) {
  const t = TONES[tone];
  return (
    <>
      <LinearGradient colors={t.base} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[t.glow, "rgba(255,255,255,0)"] as const}
        start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.78 }}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

// ---- type -------------------------------------------------------------------

export function Eyebrow({ children, color = lens.goldText, style }: {
  children: ReactNode; color?: string; style?: StyleProp<TextStyle>;
}) {
  return <Txt style={[s.eyebrow, { color }, style]} numberOfLines={1}>{children}</Txt>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <Txt style={s.pageTitle} numberOfLines={2}>{children}</Txt>;
}

export function PageSub({ children }: { children: ReactNode }) {
  return <Txt style={s.pageSub}>{children}</Txt>;
}

export function SectionHead({ title, sub, action }: {
  title: string; sub?: string | null; action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={s.sectionTitle} numberOfLines={1}>{title}</Txt>
        {sub ? <Txt style={s.sectionSub} numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8} style={s.linkRow} accessibilityRole="button">
          <Txt style={s.linkTxt}>{action.label}</Txt>
          <Feather name="arrow-up-right" size={13} color={lens.goldText} />
        </Pressable>
      )}
    </View>
  );
}

// ---- controls ---------------------------------------------------------------

export function PearlField({ value, onChangeText, placeholder }: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
}) {
  return (
    <View style={s.field}>
      <Feather name="search" size={18} color={lens.ink} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={lens.inkFaint}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={s.input}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} hitSlop={10} accessibilityLabel="Clear search">
          <Feather name="x-circle" size={17} color={lens.inkFaint} />
        </Pressable>
      )}
    </View>
  );
}

/** Two or three choices on a frosted track, the chosen one raised. */
export function PearlSegment<T extends string>({ options, value, onChange }: {
  options: { id: T; label: string }[]; value: T; onChange: (id: T) => void;
}) {
  return (
    <View style={s.track} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[s.seg, on && s.segOn]}
            accessibilityRole="tab" accessibilityState={{ selected: on }}>
            {on && (
              <LinearGradient colors={["#FBFCFA", "#DFE7E7"] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
            )}
            <Txt style={[s.segTxt, on && s.segTxtOn]} numberOfLines={1}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SortButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.sort, pressed && { opacity: 0.85 }]}
      accessibilityRole="button" accessibilityLabel={`Sort: ${label}`}>
      <LinearGradient colors={["#FFFFFF", "#E6EDF0", "#CFDCDE"] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
      <MaterialCommunityIcons name="swap-vertical" size={16} color={lens.ink} />
      <Txt style={s.sortTxt} numberOfLines={1}>{label}</Txt>
    </Pressable>
  );
}

export function Callout({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.callout}>
      <Feather name="info" size={17} color={lens.goldText} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Txt style={s.calloutTitle}>{title}</Txt>
        <Txt style={s.calloutBody}>{body}</Txt>
      </View>
    </View>
  );
}

export function EmptyState({ title, body, action }: {
  title: string; body: string; action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}><Feather name="search" size={20} color={lens.inkSoft} /></View>
      <Txt style={s.emptyTitle}>{title}</Txt>
      <Txt style={s.emptyBody}>{body}</Txt>
      {action && (
        <Pressable onPress={action.onPress} style={({ pressed }) => [s.emptyAction, pressed && { opacity: 0.8 }]}>
          <Txt style={s.emptyActionTxt}>{action.label}</Txt>
        </Pressable>
      )}
    </View>
  );
}

// ---- panels -----------------------------------------------------------------

const initials = (name: string) =>
  name.split(/\s+/).filter((w) => w && !/^(the|of|and|a|&)$/i.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** A collection — a game, a sport or a language edition — as a glass panel
 *  with its card fanned on the trailing edge. A game with no picture carries
 *  its sport glyph, or its initials in the game's colour, in the same place. */
export function CollectionPanel({
  title, sub, meta, chip, link = "Browse sets", imageUri, gameId, tone, compact, onPress,
}: {
  title: string; sub?: string | null; meta?: string | null; chip?: string | null; link?: string;
  imageUri?: string | null; gameId: string; tone: Tone; compact?: boolean; onPress: () => void;
}) {
  const icon = sportIcon(gameId);
  const th = gameTheme(gameId);
  const artW = compact ? 56 : 78;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed }) => [s.panelShadow, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={[s.panel, compact && s.panelCompact]}>
        <Wash tone={tone} />
        <View style={{ flex: 1, paddingRight: artW + 30 }}>
          <Txt style={[s.panelTitle, compact && s.panelTitleCompact]} numberOfLines={2}>{title}</Txt>
          {chip ? <View style={s.chip}><Txt style={s.chipTxt} numberOfLines={1}>{chip}</Txt></View> : null}
          {sub ? <Txt style={s.panelSub} numberOfLines={2}>{sub}</Txt> : null}
          <View style={[s.linkRow, { marginTop: compact ? 9 : 16 }]}>
            <Txt style={s.linkTxt}>{link}</Txt>
            <Feather name="arrow-up-right" size={13} color={lens.goldText} />
            {meta ? <Txt style={s.metaTxt} numberOfLines={1}>{`  ·  ${meta}`}</Txt> : null}
          </View>
        </View>
        {imageUri ? (
          <View pointerEvents="none" style={[s.fan, { right: compact ? 12 : 16, top: compact ? 12 : 18, width: artW + 26, height: artW * 1.4 + 12 }]}>
            <View style={[s.fanBack, { width: artW, height: artW * 1.4, backgroundColor: TONES[tone].line }]} />
            <View style={[s.fanFront, { width: artW, height: artW * 1.4 }]}>
              <CardArt uri={imageUri} iconSize={16} />
            </View>
          </View>
        ) : icon ? (
          <MaterialCommunityIcons name={icon as never} size={compact ? 50 : 66} color={th.tint}
            style={[s.glyph, { top: compact ? 22 : 34 }]} />
        ) : (
          <Txt style={[s.initials, { color: th.tint, top: compact ? 18 : 32 }]}>{initials(title)}</Txt>
        )}
      </View>
    </Pressable>
  );
}

const compactNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}m` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();

export const monthYear = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" });
};

/** The mark a set is known by when it has no clean logo: its code ("OP13",
 *  "SDS"), a sports set's year, or its initials. The catalogues disagree on
 *  what a set's picture is — a logo, a box photograph, a seller's photo, an
 *  SVG the app cannot draw — so only TCGdex's logos, which are all one kind
 *  of thing, are shown as pictures. */
function emblemOf(set: SetSummary, sport: boolean): string {
  if (sport) return /^(\d{4})/.exec(set.name)?.[1] ?? initials(set.name);
  const tail = set.setId.split(":").pop() ?? "";
  return /^[a-z0-9.]{2,6}$/i.test(tail) ? tail.toUpperCase() : initials(set.name);
}

export function setLogo(set: { logo?: string | null }): string | null {
  return set.logo && /assets\.tcgdex\.net/.test(set.logo) ? set.logo : null;
}

export function SetSummaryPanel({ set, gameId, eyebrow, tone, onPress }: {
  set: SetSummary; gameId: string; eyebrow: string; tone: Tone; onPress: () => void;
}) {
  const sport = sportOf(gameId) != null;
  const total = Number(set.total) || 0;
  const listed = Number(set.listed) || 0;
  const facts = [
    total > 0 ? `${total.toLocaleString()} cards` : listed > 0 ? `${compactNum(listed)} listed` : null,
    sport ? null : monthYear(set.releasedAt),
  ].filter(Boolean).join(" · ");
  const logo = setLogo(set);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={set.name}
      style={({ pressed }) => [s.panelShadow, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={[s.panel, s.setPanel]}>
        <Wash tone={tone} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Txt style={[s.panelTitle, { marginTop: 6 }, set.name.length > 26 && s.panelTitleCompact]} numberOfLines={2}>
            {set.name}
          </Txt>
          {facts ? <Txt style={s.panelSub} numberOfLines={1}>{facts}</Txt> : null}
          <View style={[s.linkRow, { marginTop: 12 }]}>
            <Txt style={s.linkTxt}>{sport ? "View players" : "View raw prices"}</Txt>
            <Feather name="arrow-up-right" size={13} color={lens.goldText} />
          </View>
        </View>
        {logo ? (
          <Image source={{ uri: logo }} style={s.setLogo} resizeMode="contain" />
        ) : (
          <Txt style={s.emblem} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{emblemOf(set, sport)}</Txt>
        )}
      </View>
    </Pressable>
  );
}

export function PanelBone({ compact }: { compact?: boolean }) {
  return (
    <View style={[s.panel, compact && s.panelCompact, { backgroundColor: "rgba(255,255,255,0.45)" }]}>
      <Shimmer />
    </View>
  );
}

// ---- card tiles -------------------------------------------------------------

/** Why a tile has no price, said where the price would be. Short on purpose:
 *  it opens over the card art, and a paragraph there covers the card. */
export type PriceWhy = { title: string; body: string };
export const NO_RAW_PRICE_WHY: PriceWhy = {
  title: "No estimate yet",
  body: "No comparable raw sales for this exact card. A missing price isn't a low one.",
};
export const NOTHING_LISTED_WHY: PriceWhy = {
  title: "Nothing listed right now",
  body: "No single copy of this player in this set is for sale on eBay today.",
};
export const CHECKING_LISTINGS_WHY: PriceWhy = {
  title: "Checking listings",
  body: "Looking up the cheapest copy for sale right now.",
};

/** "$285" in the viewer's dollars, from whatever currency the figure is in —
 *  a sports ask on eBay AU arrives in AUD, one on eBay US in USD. */
function priceText(n: number, from: string, fx: Fx | null): string {
  if (from === "USD") return dollars(n, fx).text;
  const a = convert(n, { fx, from });
  return a != null ? aud(a).replace(/^A\$/, "$") : money(n, { fx, from }).replace(/^US\$/, "$");
}

/** A price we will not print: a figure-shaped blur, so the tile reads as
 *  "the number is withheld" rather than "still loading", with the reason one
 *  tap away. */
function HiddenPrice({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={s.hiddenRow} hitSlop={8}
      accessibilityRole="button" accessibilityLabel="Why no price is shown" accessibilityState={{ expanded: open }}>
      <Txt style={[s.tilePrice, s.ghostPrice]} numberOfLines={1}>$••••</Txt>
      <View style={[s.infoDot, open && s.infoDotOn]}>
        <Feather name="info" size={12} color={open ? "#FFFFFF" : lens.goldText} />
      </View>
    </Pressable>
  );
}

/** The reason, as a frosted popover floating over the card art. It sits on
 *  top of the tile rather than inside it, so opening it never resizes the
 *  tile or leaves its neighbour's row half empty. */
function PriceTip({ why, onClose }: { why: PriceWhy; onClose: () => void }) {
  return (
    <Pressable onPress={onClose} style={s.tipShadow}
      accessibilityRole="button" accessibilityLabel={`${why.title}. ${why.body}`} accessibilityHint="Closes">
      <View style={s.tip}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        <View style={s.tipHead}>
          <Feather name="info" size={13} color={lens.goldText} />
          <Txt style={s.tipTitle} numberOfLines={1}>{why.title}</Txt>
        </View>
        <Txt style={s.tipBody}>{why.body}</Txt>
      </View>
      <View style={s.tipCaret} />
    </Pressable>
  );
}

const TRAY_A = ["#DDEAE4", "#C8D5DB"] as const;
const TRAY_B = ["#E8E2EF", "#CEDBDE"] as const;

/** One card, priced: its art on a pearlescent tray, a watchlist button in the
 *  corner, and the raw price large underneath. With no price the figure is
 *  blurred and carries its reason — never a zero, never a dash that reads as
 *  one. */
export function PriceTile({
  name, number, imageUrl, usd, currency = "USD", note, fx, alt, label = "RAW · UNGRADED", priceWhy = NO_RAW_PRICE_WHY,
  followed, onFollow, onPress,
}: {
  name: string; number?: string | null; imageUrl: string | null; usd: number | null | undefined;
  /** The currency `usd` is actually in, when it is not US dollars. */
  currency?: string;
  /** One quiet line under the price, e.g. how many are listed. */
  note?: string | null;
  fx: Fx | null;
  alt?: boolean; label?: string; priceWhy?: PriceWhy;
  followed?: boolean; onFollow?: () => void; onPress: () => void;
}) {
  const price = usd != null ? priceText(usd, currency, fx) : null;
  const [tip, setTip] = useState(false);
  return (
    <View style={s.tileShadow}>
      <View style={s.tile}>
        <Pressable onPress={onPress} style={s.tray} accessibilityRole="button" accessibilityLabel={`View ${name}`}>
          <LinearGradient colors={alt ? TRAY_B : TRAY_A} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={s.trayArt}><CardArt uri={imageUrl} resizeMode="contain" iconSize={22} /></View>
        </Pressable>
        <Pressable onPress={onPress} style={s.tileBody}>
          <Txt style={s.tileName} numberOfLines={2}>{name}</Txt>
          {number ? <View style={s.numChip}><Txt style={s.numTxt} numberOfLines={1}>#{number}</Txt></View> : null}
          <Txt style={s.rawLabel} numberOfLines={1}>{label}</Txt>
          {price ? (
            <>
              <Txt style={s.tilePrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{price}</Txt>
              {note ? <Txt style={s.priceNote} numberOfLines={1}>{note}</Txt> : null}
            </>
          ) : (
            <HiddenPrice open={tip} onToggle={() => setTip((t) => !t)} />
          )}
        </Pressable>
      </View>
      {onFollow && (
        <Pressable onPress={onFollow} hitSlop={6} style={({ pressed }) => [s.watch, followed && s.watchOn, pressed && { transform: [{ scale: 0.92 }] }]}
          accessibilityRole="button" accessibilityState={{ selected: Boolean(followed) }}
          accessibilityLabel={followed ? `Remove ${name} from watchlist` : `Add ${name} to watchlist`}>
          <Feather name={followed ? "check" : "plus"} size={19} color={followed ? "#FFFFFF" : lens.ink} />
        </Pressable>
      )}
      {tip && !price && <PriceTip why={priceWhy} onClose={() => setTip(false)} />}
    </View>
  );
}

export function PriceTileBone() {
  return (
    <View style={s.tileShadow}>
      <View style={s.tile}>
        <View style={[s.tray, { backgroundColor: "rgba(255,255,255,0.4)" }]}><Shimmer /></View>
        <View style={[s.tileBody, { gap: 8 }]}>
          <View style={[s.bar, { width: "70%" }]} />
          <View style={[s.bar, { width: "35%" }]} />
          <View style={[s.bar, { width: "50%", height: 22 }]} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { fontFamily: fonts.semi, fontSize: 11, lineHeight: lh(11), letterSpacing: 1.5 },
  pageTitle: { fontFamily: fonts.semi, fontSize: 34, lineHeight: lh(34), letterSpacing: -1.3, color: lens.ink, marginTop: 6 },
  pageSub: { fontFamily: fonts.regular, fontSize: 14, lineHeight: lh(14), color: lens.inkSoft, marginTop: 2 },

  sectionHead: {
    flexDirection: "row", alignItems: "flex-end", gap: 12,
    paddingHorizontal: 20, marginTop: 26, marginBottom: 12,
  },
  sectionTitle: { fontFamily: fonts.semi, fontSize: 22, lineHeight: lh(22), letterSpacing: -0.5, color: lens.ink },
  sectionSub: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  linkTxt: { fontFamily: fonts.semi, fontSize: 13, lineHeight: lh(13), color: lens.goldText },
  metaTxt: { fontFamily: fonts.medium, fontSize: 12, lineHeight: lh(12), color: lens.inkFaint, flexShrink: 1 },

  field: {
    flexDirection: "row", alignItems: "center", gap: 10, height: 52, marginTop: 18, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1, borderColor: "#8D999F", backgroundColor: "rgba(255,255,255,0.85)",
    shadowColor: "#1A2632", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15.5, color: lens.ink, paddingVertical: 0 },

  track: {
    flexDirection: "row", gap: 4, padding: 4, marginTop: 16, borderRadius: 18,
    borderWidth: 1, borderColor: "#879BA3", backgroundColor: "rgba(174,190,192,0.45)",
  },
  seg: { flex: 1, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  segOn: {
    shadowColor: "#263D4C", shadowOpacity: 0.17, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
    backgroundColor: "#F2F5F3",
  },
  segTxt: { fontFamily: fonts.medium, fontSize: 14, lineHeight: lh(14), color: lens.inkSoft },
  segTxtOn: { fontFamily: fonts.semi, color: lens.ink },

  sort: {
    flexDirection: "row", alignItems: "center", gap: 6, height: 42, paddingHorizontal: 12, borderRadius: 14,
    borderWidth: 1, borderColor: "#7D949E", overflow: "hidden", maxWidth: 210,
  },
  sortTxt: { fontFamily: fonts.medium, fontSize: 13, lineHeight: lh(13), color: lens.ink, flexShrink: 1 },

  callout: {
    flexDirection: "row", gap: 10, padding: 14, marginTop: 12, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", backgroundColor: "rgba(255,255,255,0.6)",
  },
  calloutTitle: { fontFamily: fonts.semi, fontSize: 14, lineHeight: lh(14), color: lens.ink },
  calloutBody: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: lh(12.5), color: lens.inkSoft, marginTop: 2 },

  empty: { alignItems: "center", marginTop: 36, paddingHorizontal: 28 },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  emptyTitle: { fontFamily: fonts.semi, fontSize: 17, lineHeight: lh(17), color: lens.ink, marginTop: 12, textAlign: "center" },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: lh(13.5), color: lens.inkSoft, marginTop: 4, textAlign: "center" },
  emptyAction: { marginTop: 14, paddingHorizontal: 18, height: 42, borderRadius: 14, justifyContent: "center", backgroundColor: lens.ink },
  emptyActionTxt: { fontFamily: fonts.semi, fontSize: 14, lineHeight: lh(14), color: "#FFFFFF" },

  panelShadow: {
    borderRadius: 24,
    shadowColor: "#253F59", shadowOpacity: 0.13, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  panel: {
    minHeight: 144, borderRadius: 24, overflow: "hidden", padding: 22, justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.95)",
  },
  panelCompact: { minHeight: 104, paddingVertical: 16, paddingHorizontal: 18 },
  setPanel: { minHeight: 132, flexDirection: "row", alignItems: "center", gap: 12 },
  panelTitle: { fontFamily: fonts.semi, fontSize: 23, lineHeight: lh(23), letterSpacing: -0.6, color: lens.ink },
  panelTitleCompact: { fontSize: 18.5, lineHeight: lh(18.5), letterSpacing: -0.4 },
  panelSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: lh(13), color: lens.inkSoft, marginTop: 5 },
  chip: {
    alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    backgroundColor: "rgba(28,39,51,0.08)",
  },
  chipTxt: { fontFamily: fonts.semi, fontSize: 11, lineHeight: lh(11), color: lens.ink },

  fan: { position: "absolute" },
  fanBack: {
    position: "absolute", left: 0, top: 10, borderRadius: 6, opacity: 0.7, transform: [{ rotate: "-10deg" }],
  },
  fanFront: {
    position: "absolute", right: 0, top: 0, borderRadius: 6, overflow: "hidden", backgroundColor: "#D8DDE3",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", transform: [{ rotate: "11deg" }],
  },
  glyph: { position: "absolute", right: 20, opacity: 0.55 },
  initials: { position: "absolute", right: 20, fontFamily: fonts.bold, fontSize: 44, lineHeight: lh(44), opacity: 0.3 },
  setLogo: { width: 104, height: 58 },
  emblem: {
    maxWidth: 96, fontFamily: fonts.bold, fontSize: 30, lineHeight: lh(30), letterSpacing: -0.5,
    color: "rgba(28,39,51,0.22)", textAlign: "right",
  },

  tileShadow: {
    flex: 1, borderRadius: 21,
    shadowColor: "#30475A", shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  tile: {
    flex: 1, borderRadius: 21, overflow: "hidden", borderWidth: 1, borderColor: "#FFFFFF",
    backgroundColor: "rgba(250,251,249,0.94)",
  },
  tray: { height: 176, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 12 },
  trayArt: { flex: 1 },
  tileBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 15 },
  tileName: { fontFamily: fonts.semi, fontSize: 15.5, lineHeight: lh(15.5), letterSpacing: -0.2, color: lens.ink },
  numChip: {
    alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7,
    borderWidth: 1, borderColor: "#9AA6AC", backgroundColor: "rgba(255,255,255,0.7)", maxWidth: "100%",
  },
  numTxt: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: lh(11.5), color: lens.inkSoft },
  rawLabel: { fontFamily: fonts.semi, fontSize: 10, lineHeight: lh(10), letterSpacing: 1, color: lens.goldText, marginTop: 12 },
  tilePrice: {
    fontFamily: fonts.semi, fontSize: 27, lineHeight: lh(27), letterSpacing: -0.9, color: lens.ink, marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  priceNote: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: lh(11.5), color: lens.inkFaint, marginTop: 1 },
  hiddenRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, alignSelf: "flex-start" },
  // A masked figure, softened by its own shadow so it reads as withheld.
  // Two earlier tries failed on the phone: a BlurView over the digits went to
  // a grey bar that looked like a loading skeleton, and a transparent figure
  // drawn only as its shadow drew nothing at all — iOS scales a text shadow
  // by the fill's alpha. Dots also never show a made-up number.
  ghostPrice: {
    marginTop: 0, letterSpacing: 1.5, color: "rgba(28,39,51,0.3)",
    textShadowColor: "rgba(28,39,51,0.4)", textShadowRadius: 7, textShadowOffset: { width: 0, height: 0 },
  },
  infoDot: {
    width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center",
    backgroundColor: lens.cream, borderWidth: 1, borderColor: "rgba(122,99,64,0.35)",
  },
  infoDotOn: { backgroundColor: lens.ink, borderColor: lens.ink },
  tipShadow: {
    position: "absolute", left: 8, right: 8, bottom: 60,
    shadowColor: "#1A2632", shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  tip: {
    borderRadius: 16, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 11,
    backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: "#FFFFFF",
  },
  tipHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  tipTitle: { fontFamily: fonts.semi, fontSize: 13.5, lineHeight: lh(13.5), color: lens.ink, flexShrink: 1 },
  tipBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: lh(12), color: lens.inkSoft, marginTop: 4 },
  tipCaret: {
    position: "absolute", bottom: -6, left: 26, width: 12, height: 12, backgroundColor: "#F7F8F7",
    borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#FFFFFF", transform: [{ rotate: "45deg" }],
  },
  watch: {
    position: "absolute", top: 8, right: 8, width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#FBFCFB", borderWidth: 1, borderColor: "#899DA4",
    shadowColor: "#20364A", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  watchOn: { backgroundColor: lens.ink, borderColor: lens.ink },
  bar: { height: 12, borderRadius: 6, backgroundColor: "rgba(28,39,51,0.08)" },
});
