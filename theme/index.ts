export { colors, palette } from "./colors";
export { type, fonts } from "./type";

/** 4pt grid. Every gap in the app is one of these. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

/** One soft shadow, used sparingly. Depth comes from hairlines, not drop
 *  shadows — a screen where everything floats reads as noise. */
export const shadow = {
  card: {
    shadowColor: "#0B1622", shadowOpacity: 0.05, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  lifted: {
    shadowColor: "#0B1622", shadowOpacity: 0.14, shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 }, elevation: 10,
  },
} as const;
