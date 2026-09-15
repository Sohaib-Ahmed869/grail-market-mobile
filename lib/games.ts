/** A colour per game.
 *
 *  The dashboard was navy, white and one gold accent, which is correct and
 *  colourless: every card on it looked the same whether it was a Charizard
 *  or a Blue-Eyes. Games are the one axis in this product that people
 *  already hold a colour for, so that is where colour belongs — not invented
 *  and sprinkled about, but taken from the thing it names.
 *
 *  Each is pulled toward the brand's own weight rather than used at full
 *  saturation: Pokemon's yellow at full strength is unreadable on white and
 *  belongs to a children's logo, not to a market. `tint` reads as text and
 *  as a fill behind white; `wash` is the same hue at the strength of a
 *  highlighter, for a chip's background.
 */
export type GameTheme = { label: string; short: string; tint: string; wash: string };

const GAMES: Record<string, GameTheme> = {
  pokemon:  { label: "Pokémon",   short: "PKM", tint: "#C08A1E", wash: "#FBF3E0" },
  onepiece: { label: "One Piece", short: "OP",  tint: "#C0453F", wash: "#FBEDEC" },
  mtg:      { label: "Magic",     short: "MTG", tint: "#6E5399", wash: "#F1EDF8" },
  yugioh:   { label: "Yu-Gi-Oh!", short: "YGO", tint: "#A85C2A", wash: "#FAEFE7" },
  lorcana:  { label: "Lorcana",   short: "LOR", tint: "#26786F", wash: "#E6F3F1" },
  digimon:  { label: "Digimon",   short: "DGM", tint: "#2C6396", wash: "#E9F0F8" },
  swu:      { label: "Star Wars", short: "SWU", tint: "#4A5A6B", wash: "#EDF0F3" },
  sorcery:  { label: "Sorcery",   short: "SOR", tint: "#7A5340", wash: "#F5EDE8" },
  ga:       { label: "Grand Archive", short: "GA", tint: "#5C6E33", wash: "#F0F3E6" },
};

/** The fallback is the brand's own gold rather than a grey: a game we have
 *  no colour for is still a game, and a grey chip in a row of coloured ones
 *  reads as a fault. */
const UNKNOWN: GameTheme = { label: "Cards", short: "TCG", tint: "#8A7448", wash: "#F6F2E8" };

/** Sports, keyed by the slug after `sport:`.
 *
 *  Kept apart from GAMES rather than added to it: the home screen offers the
 *  first eight of GAME_IDS as its game row, and a sport arriving in that row
 *  would push a trading card game off it without anybody deciding that.
 *
 *  Sports carry a glyph where games will carry a logo — a basketball is a
 *  better mark for basketball than any league's wordmark, and it belongs to
 *  nobody. */
const SPORTS: Record<string, GameTheme & { icon: string }> = {
  basketball: { label: "Basketball", short: "NBA", tint: "#C4622D", wash: "#FAEEE7", icon: "basketball" },
  baseball:   { label: "Baseball",   short: "MLB", tint: "#B0403A", wash: "#FAECEB", icon: "baseball" },
  football:   { label: "Football",   short: "NFL", tint: "#5E7A3A", wash: "#EFF3E8", icon: "football" },
  soccer:     { label: "Soccer",     short: "FUT", tint: "#2F7A55", wash: "#E8F3EE", icon: "soccer" },
  hockey:     { label: "Hockey",     short: "NHL", tint: "#3B6690", wash: "#EAF0F6", icon: "hockey-puck" },
  afl:        { label: "AFL",        short: "AFL", tint: "#2D5C8C", wash: "#E9EFF6", icon: "football-australian" },
  nrl:        { label: "NRL",        short: "NRL", tint: "#3F7A3A", wash: "#EBF3EA", icon: "rugby" },
  racing:     { label: "Racing",     short: "F1",  tint: "#B23A3A", wash: "#FAEBEB", icon: "flag-checkered" },
  mma:        { label: "UFC & MMA",  short: "UFC", tint: "#7A3F3F", wash: "#F5EBEB", icon: "mixed-martial-arts" },
  wrestling:  { label: "Wrestling",  short: "WWE", tint: "#6B4A8A", wash: "#F1ECF6", icon: "trophy" },
  golf:       { label: "Golf",       short: "PGA", tint: "#3E7A4C", wash: "#EAF3EC", icon: "golf" },
  tennis:     { label: "Tennis",     short: "ATP", tint: "#8A8A2A", wash: "#F4F4E6", icon: "tennis" },
  boxing:     { label: "Boxing",     short: "BOX", tint: "#A33B3B", wash: "#FAEBEB", icon: "boxing-glove" },
  cricket:    { label: "Cricket",    short: "CRI", tint: "#4F7A3A", wash: "#EDF3E8", icon: "cricket" },
};

/** `sport:basketball` -> `basketball`. Card Hedge's categories arrive as
 *  `ch:Basketball` and are the same sport under a bought catalogue, so they
 *  resolve to the same theme. */
export const sportOf = (id: string | null | undefined): string | null => {
  const m = /^(?:sport|ch):(.+)$/i.exec(id ?? "");
  if (!m) return null;
  const slug = m[1]!.toLowerCase().split(":")[0]!;
  return SPORTS[slug] ? slug : null;
};

/** The glyph for a sport, or null for anything that is not one. */
export const sportIcon = (id: string | null | undefined): string | null => {
  const slug = sportOf(id);
  return slug ? SPORTS[slug]!.icon : null;
};

/** `lang:pokemon:fr` and `pokemonjp` wear their base game's colour — a
 *  Japanese Pokémon card is still Pokémon. */
const baseOf = (id: string) =>
  id === "pokemonjp" ? "pokemon" : (/^lang:([^:]+):/.exec(id)?.[1] ?? id);

export const gameTheme = (raw: string | null | undefined): GameTheme => {
  if (!raw) return UNKNOWN;
  const id = baseOf(raw);
  const sport = sportOf(id);
  return GAMES[id] ?? (sport ? SPORTS[sport] : undefined) ?? UNKNOWN;
};

/** The order they are offered in, which is the order they were added to the
 *  catalogue rather than anything editorial. */
export const GAME_IDS = Object.keys(GAMES);
