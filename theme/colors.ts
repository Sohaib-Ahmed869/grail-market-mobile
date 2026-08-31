// The palette, taken from the GrailMarket brand sheet.
//
// Two colour directions exist in the supplied assets and they do not agree:
// this one (Navy + Gold), which the brand sheet, the app icon, the splash
// screen and all 44 wireframe screens use, and "Harbour" (a pale marine
// ground, #EDF3F8 / #1E5A7C), which is direction 2 of 5 and still marked "for
// review". Navy is what every finished artefact actually shows, so it is what
// is built here.
//
// If Harbour wins, this file is the only thing that changes — nothing else
// names a hex value.
export const palette = {
  navy: "#0F1B2A",
  gold: "#C8A868",
  white: "#FFFFFF",
  lightGray: "#F2F4F7",
} as const;

export const colors = {
  // surfaces
  background: palette.navy,
  surface: "#162436",
  surfaceRaised: "#1A2A3D",
  border: "#24374D",

  // text
  text: palette.white,
  textMuted: "#93A3B5",
  textFaint: "#5E7189",
  onGold: palette.navy,

  // brand
  accent: palette.gold,
  accentMuted: "#8C7444",

  // meaning. A price that falls is information, not a fault, so "down" is
  // closer to brick than to alarm red.
  up: "#2C7A5B",
  down: "#AE4A40",

  // the light surfaces, for screens that invert
  ground: palette.lightGray,
  onGround: palette.navy,
} as const;

export type ColorName = keyof typeof colors;
