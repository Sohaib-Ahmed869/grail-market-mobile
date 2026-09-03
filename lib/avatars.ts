// The built-in faces.
//
// Drawn by the app as vector, not uploaded and not emoji. Emoji were the
// first attempt and they were wrong for two reasons: they are somebody
// else's artwork rendered by the OS, so they change between iOS versions and
// look nothing like each other; and a yellow blob on a gradient is a
// placeholder, not a character.
//
// These are built from parts — a body colour, a face shape, eyes, a mouth,
// and something on top — so twelve presets read as twelve characters rather
// than twelve swatches. The database stores the preset id and nothing else.

export type Face = {
  id: string;
  label: string;
  /** the two body colours, top then bottom */
  from: string;
  to: string;
  /** the ground behind the character */
  bg: string;
  eyes: "dot" | "happy" | "wink" | "wide" | "shade" | "star";
  mouth: "smile" | "grin" | "flat" | "smirk" | "open" | "none";
  /** a crest, ears, horns or nothing */
  top: "none" | "ears" | "horns" | "crest" | "cap" | "halo";
  /** the mark on the chest, in the same ink as the outline */
  chest: "none" | "bolt" | "star" | "diamond" | "flame";
};

export const AVATARS: Face[] = [
  { id: "ember",  label: "Ember",   from: "#FB923C", to: "#C2410C", bg: "#FFF1E6", eyes: "wide",  mouth: "grin",  top: "horns", chest: "flame" },
  { id: "volt",   label: "Volt",    from: "#FDE047", to: "#CA8A04", bg: "#FEF9E7", eyes: "happy", mouth: "smile", top: "ears",  chest: "bolt" },
  { id: "tide",   label: "Tide",    from: "#60A5FA", to: "#1D4ED8", bg: "#EAF1FE", eyes: "dot",   mouth: "flat",  top: "crest", chest: "none" },
  { id: "moss",   label: "Moss",    from: "#4ADE80", to: "#15803D", bg: "#ECFAF0", eyes: "happy", mouth: "smile", top: "ears",  chest: "none" },
  { id: "dusk",   label: "Dusk",    from: "#A78BFA", to: "#5B21B6", bg: "#F3EEFE", eyes: "wink",  mouth: "smirk", top: "horns", chest: "star" },
  { id: "gilt",   label: "Gilt",    from: "#E4C284", to: "#A88D60", bg: "#FBF7F0", eyes: "star",  mouth: "smile", top: "halo",  chest: "diamond" },
  { id: "slate",  label: "Slate",   from: "#94A3B8", to: "#334155", bg: "#F1F3F5", eyes: "shade", mouth: "flat",  top: "cap",   chest: "none" },
  { id: "coral",  label: "Coral",   from: "#FB7185", to: "#BE123C", bg: "#FEEEF1", eyes: "wide",  mouth: "open",  top: "crest", chest: "none" },
  { id: "mint",   label: "Mint",    from: "#5EEAD4", to: "#0F766E", bg: "#E9FBF7", eyes: "dot",   mouth: "grin",  top: "none",  chest: "star" },
  { id: "ink",    label: "Ink",     from: "#475569", to: "#1A2632", bg: "#EDEFF2", eyes: "shade", mouth: "smirk", top: "horns", chest: "none" },
  { id: "sun",    label: "Sun",     from: "#FCD34D", to: "#D97706", bg: "#FEF6E7", eyes: "happy", mouth: "open",  top: "halo",  chest: "flame" },
  { id: "orchid", label: "Orchid",  from: "#F0ABFC", to: "#A21CAF", bg: "#FCEEFE", eyes: "wink",  mouth: "smile", top: "ears",  chest: "diamond" },
  { id: "none",   label: "Just initials", from: "#1A2632", to: "#0B1622", bg: "#EDEFF2", eyes: "dot", mouth: "none", top: "none", chest: "none" },
];

export const avatarById = (id?: string | null) => AVATARS.find((a) => a.id === id) ?? null;

/** Someone who has never chosen still needs a face.
 *
 *  Derived from the name, not random, so the same person is the same
 *  character on every screen and every device. A face that changes on refresh
 *  is worse than no face. */
export function avatarFor(id: string | null | undefined, name: string): Face {
  const chosen = avatarById(id);
  if (chosen) return chosen;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const pool = AVATARS.filter((a) => a.id !== "none");
  return pool[h % pool.length];
}

export const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
