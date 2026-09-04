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
  // People, not speech bubbles. A forum bubble and the Messages tab's
  // chatbubbles are the same drawing at 22pt, so the two tabs read as the same
  // place — and the difference that matters is that one is everybody and the
  // other is one person.
  community:   { family: "mc",  on: "account-group",    off: "account-group-outline" },
  scan:        { family: "mc",  on: "line-scan",         off: "line-scan" },
  // A telescope, not a bookmark and not an eye. A bookmark says "saved for
  // later", which is a reading list, not a price you want to be told about;
  // an eye collides with the view count sitting on the same card page. This
  // is watching something distant and worth having, which is the product.
  watchlist:   { family: "ion", on: "telescope",         off: "telescope-outline" },
  // Following ONE card: deliberately the Watchlist tab's own glyph. The button
  // and the place it puts the card have to look like the same idea, or nobody
  // connects "Follow" with the tab it lands in. Filled = already following.
  follow:      { family: "ion", on: "telescope",         off: "telescope-outline" },
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
  // Sliders, not a cog. This opens what you are told about and how loudly,
  // which is a set of choices — a cog says "the settings screen", and there is
  // already one of those.
  settings:    { family: "ion", on: "options",            off: "options-outline" },
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
