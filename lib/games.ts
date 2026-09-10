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

export const gameTheme = (id: string | null | undefined): GameTheme =>
  (id ? GAMES[id] : undefined) ?? UNKNOWN;

/** The order they are offered in, which is the order they were added to the
 *  catalogue rather than anything editorial. */
export const GAME_IDS = Object.keys(GAMES);
