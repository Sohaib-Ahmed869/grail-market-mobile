// Outfit throughout — a geometric sans with a wide, even lower case, which
// suits a product whose screens are mostly numbers and card names. One
// family, four weights: fewer files to load and a cleaner rhythm than mixing
// two faces.
//
// No uppercase anywhere in the scale. Small caps with wide tracking is the
// house style of every dashboard template, it shouts labels that are meant to
// be quiet, and at 10pt it is harder to read than the sentence case it
// replaced. Emphasis comes from weight and colour instead.
export const fonts = {
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semi: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
} as const;

export const type = {
  display:   { fontFamily: fonts.bold, fontSize: 30, lineHeight: 37, letterSpacing: -0.6 },
  h1:        { fontFamily: fonts.semi, fontSize: 25, lineHeight: 32, letterSpacing: -0.4 },
  h2:        { fontFamily: fonts.semi, fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  h3:        { fontFamily: fonts.semi, fontSize: 15.5, lineHeight: 21 },
  body:      { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 23 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 19 },
  label:     { fontFamily: fonts.semi,   fontSize: 13.5, lineHeight: 18 },
  button:    { fontFamily: fonts.semi, fontSize: 15.5, lineHeight: 21 },
  // was "overline": small caps, 1.2 tracking. Now a quiet label — the same
  // job, without the shouting.
  overline:  { fontFamily: fonts.semi, fontSize: 12, lineHeight: 16 },
  // figures line up column to column as they update
  price:     { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8,
               fontVariant: ["tabular-nums"] as const },
} as const;
