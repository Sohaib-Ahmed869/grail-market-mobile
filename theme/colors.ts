// GrailMarket_Brand_Assets_v1/brand_tokens.json is the source of truth. It
// supersedes the earlier brand sheet, which had slightly different values
// (#0F1B2A / #C8A868) and named Poppins — the approved pack is Inter.
export const palette = {
  navy: "#1A2632",
  gold: "#A88D60",
  white: "#FFFFFF",
  lightGray: "#F2F4F7",
} as const;

// The app runs light. Navy is the ink and the action; only the splash and the
// hero band are dark. Gold is an accent — it marks the one thing on a screen
// worth the eye, and stops meaning anything if it marks four.
export const colors = {
  ground: palette.lightGray,       // behind everything
  surface: palette.white,          // cards, sheets, fields
  surfaceSunk: "#F7F9FB",          // wells inside a surface

  ink: palette.navy,               // headings, primary text
  inkMuted: "#5A6875",             // body and secondary
  inkFaint: "#8D99A6",             // captions, placeholders
  line: "#E3E8ED",                 // hairlines and field borders
  lineStrong: "#D2DAE2",

  accent: palette.gold,
  accentWash: "#FBF7F0",           // the cream panel behind a gold moment
  accentLine: "#EADFCB",

  // dark surfaces: splash, hero bands, primary buttons
  dark: palette.navy,
  darkRaised: "#22303E",
  onDark: palette.white,
  onDarkMuted: "#9FB0C0",

  // meaning. A falling price is information, not a fault, so it reads closer
  // to brick than to alarm.
  up: "#2C7A5B",
  upWash: "#EAF5F0",
  down: "#AE4A40",
  downWash: "#FBEEED",
  info: "#2F5D8A",
  infoWash: "#EEF4FA",

  onAccent: palette.navy,
  onPrimary: palette.white,
} as const;
