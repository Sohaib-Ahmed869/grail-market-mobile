// Inter throughout — headings and interface emphasis at SemiBold, copy at
// Regular, per the approved brand pack. One family, four weights: fewer files
// to load and a cleaner rhythm than mixing two faces.
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const type = {
  display:   { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.7 },
  h1:        { fontFamily: fonts.semi, fontSize: 25, lineHeight: 31, letterSpacing: -0.5 },
  h2:        { fontFamily: fonts.semi, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  h3:        { fontFamily: fonts.semi, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  body:      { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  label:     { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  button:    { fontFamily: fonts.semi, fontSize: 15.5, lineHeight: 20, letterSpacing: -0.1 },
  overline:  { fontFamily: fonts.semi, fontSize: 10.5, lineHeight: 14,
               letterSpacing: 1.2, textTransform: "uppercase" as const },
  // figures line up column to column as they update
  price:     { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8,
               fontVariant: ["tabular-nums"] as const },
} as const;
