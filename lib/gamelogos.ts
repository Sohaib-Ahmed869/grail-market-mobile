import type { ImageSourcePropType } from "react-native";

// Each game's own logo, once the file is in assets/games/.
//
// Same arrangement as graderlogos.ts, for the same reason: Metro resolves
// require() at build time, so a line added before its file exists is a build
// error rather than a blank tile. Add the line when the file lands. A game
// with no entry draws its name as a wordmark, so a missing logo never breaks
// the grid — it just reads plainer than its neighbours.
//
// These are the publishers' marks. Use the light-on-dark version (white or
// full colour on transparent) at about 600px wide — the tile is navy.

export const GAME_LOGOS: Record<string, ImageSourcePropType> = {
  // pokemon: require("../assets/games/pokemon.png"),
  // mtg: require("../assets/games/mtg.png"),
  // yugioh: require("../assets/games/yugioh.png"),
  // lorcana: require("../assets/games/lorcana.png"),
  // onepiece: require("../assets/games/onepiece.png"),
  // fab: require("../assets/games/fab.png"),
  // riftbound: require("../assets/games/riftbound.png"),
  // dbsfusion: require("../assets/games/dbsfusion.png"),
  // palworld: require("../assets/games/palworld.png"),
  // weiss: require("../assets/games/weiss.png"),
  // unionarena: require("../assets/games/unionarena.png"),
};

export const gameLogo = (id: string): ImageSourcePropType | null => GAME_LOGOS[id] ?? null;
