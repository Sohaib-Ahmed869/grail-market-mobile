import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// One icon vocabulary for the app.
//
// Feather was the default and it is the wrong family here: every glyph is the
// same 2px outline, so a briefcase, a tag and a bag all read as "generic
// rounded rectangle" at 20pt. This product is about cards, grading and money,
// and Material Community has actual drawings for those — a stack of cards, a
// bookmark, a bell with a badge — while Ionicons gives filled/outline pairs,
// which is what makes a selected tab look selected without changing colour.
//
// Names here are what the thing IS, not what it looks like. `collection`
// rather than `briefcase`, so swapping the drawing later is one line.

type Family = "mc" | "ion";
type Spec = { family: Family; on: string; off: string };

const ICONS = {
  home:        { family: "ion", on: "home",              off: "home-outline" },
  community:   { family: "mc",  on: "forum",             off: "forum-outline" },
  scan:        { family: "mc",  on: "line-scan",         off: "line-scan" },
  watchlist:   { family: "mc",  on: "bookmark-multiple", off: "bookmark-multiple-outline" },
  collection:  { family: "mc",  on: "cards",             off: "cards-outline" },
  profile:     { family: "ion", on: "person-circle",     off: "person-circle-outline" },

  search:      { family: "ion", on: "search",            off: "search-outline" },
  messages:    { family: "ion", on: "chatbubbles",       off: "chatbubbles-outline" },
  notify:      { family: "ion", on: "notifications",     off: "notifications-outline" },
  market:      { family: "mc",  on: "storefront",        off: "storefront-outline" },
  selling:     { family: "mc",  on: "tag-multiple",      off: "tag-multiple-outline" },
  offer:       { family: "mc",  on: "handshake",         off: "handshake-outline" },
  price:       { family: "mc",  on: "chart-line",        off: "chart-line" },
  grade:       { family: "mc",  on: "shield-star",       off: "shield-star-outline" },
  verified:    { family: "mc",  on: "shield-check",      off: "shield-check-outline" },
  photo:       { family: "mc",  on: "camera",            off: "camera-outline" },
  star:        { family: "ion", on: "star",              off: "star-outline" },
  bell:        { family: "mc",  on: "bell-ring",         off: "bell-outline" },
  card:        { family: "mc",  on: "cards-playing",     off: "cards-playing-outline" },
  sold:        { family: "mc",  on: "hand-coin",         off: "hand-coin-outline" },
  lock:        { family: "mc",  on: "lock",               off: "lock-outline" },
  key:         { family: "mc",  on: "key-variant",        off: "key-outline" },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name, size = 22, color, filled = false,
}: {
  name: IconName; size?: number; color: string; filled?: boolean;
}) {
  const spec = ICONS[name] as Spec;
  const glyph = filled ? spec.on : spec.off;
  return spec.family === "mc"
    ? <MaterialCommunityIcons name={glyph as never} size={size} color={color} />
    : <Ionicons name={glyph as never} size={size} color={color} />;
}
