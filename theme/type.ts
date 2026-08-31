// Poppins SemiBold for headings, Inter for copy and UI — brand sheet, panel 6.
export const fonts = {
  heading: "Poppins_600SemiBold",
  headingBold: "Poppins_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
} as const;

export const type = {
  display: { fontFamily: fonts.headingBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  // the all-caps micro label used above values throughout the wireframes
  overline: {
    fontFamily: fonts.bodySemi, fontSize: 11, lineHeight: 14,
    letterSpacing: 1.1, textTransform: "uppercase" as const,
  },
  // prices: tabular so digits do not jitter as a figure updates
  price: { fontFamily: fonts.headingBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
} as const;
