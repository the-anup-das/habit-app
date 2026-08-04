import type { MoodGroup } from "@chapter/core";

/**
 * The mood ramp — semantic data colour, authored in OKLCH.
 *
 * Lightness is monotonic BY CONSTRUCTION (.364 → .854), so contrast compliance
 * is a property of the palette rather than something checked after the fact.
 * The axis is blue→yellow, which is the one deutan and protan colour blindness
 * leaves intact; red→green is the axis it collapses.
 *
 * NEVER overridden by Material You. If dynamic colour could reach these five
 * values, changing a wallpaper would silently alter what a user's data means.
 * Enforced by tools/check-boundaries.mjs.
 */
export interface MoodToken {
  readonly group: MoodGroup;
  /** Time of day this mood reads as. Mood is a time of day, not a grade. */
  readonly sky: string;
  readonly light: string;
  readonly dark: string;
}

export const MOOD_TOKENS: Readonly<Record<MoodGroup, MoodToken>> = {
  1: {
    group: 1,
    sky: "deep night",
    light: "oklch(0.364 0.086 271)",
    dark: "oklch(0.500 0.100 271)",
  },
  2: {
    group: 2,
    sky: "late dusk",
    light: "oklch(0.469 0.102 291)",
    dark: "oklch(0.610 0.100 291)",
  },
  3: { group: 3, sky: "overcast", light: "oklch(0.627 0.057 294)", dark: "oklch(0.710 0.045 294)" },
  4: {
    group: 4,
    sky: "first light",
    light: "oklch(0.766 0.131 70)",
    dark: "oklch(0.790 0.128 70)",
  },
  5: {
    group: 5,
    sky: "golden hour",
    light: "oklch(0.854 0.133 85)",
    dark: "oklch(0.875 0.130 85)",
  },
};

/** Text colour that meets AA on each mood fill. */
export const MOOD_ON_DARK = "oklch(0.97 0.010 290)";
export const MOOD_ON_LIGHT = "oklch(0.24 0.045 72)";

export function moodColor(group: MoodGroup, scheme: "light" | "dark"): string {
  return MOOD_TOKENS[group][scheme];
}

export function moodOnColor(group: MoodGroup): string {
  return group >= 4 ? MOOD_ON_LIGHT : MOOD_ON_DARK;
}

// ------------------------------------------------------------------
// Base Semantic Tokens (Premium Aesthetics)
// ------------------------------------------------------------------

export const TYPOGRAPHY = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  sizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  }
} as const;

export const SPACING = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const;

export const RADII = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const SHADOWS = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
} as const;

/**
 * We define an elegant, slightly tinted dark mode palette as default 
 * to meet the "sleek dark modes" and "glassmorphism" requirement.
 */
export const COLORS = {
  light: {
    background: "#f8fafc",
    surface1: "#ffffff",
    surface2: "#f1f5f9",
    surface3: "#e2e8f0",
    ink1: "#0f172a",
    ink2: "#334155",
    ink3: "#64748b",
    primary: "oklch(0.6 0.15 250)",
    glass: "rgba(255, 255, 255, 0.7)",
  },
  dark: {
    background: "#09090b",
    surface1: "#18181b",
    surface2: "#27272a",
    surface3: "#3f3f46",
    ink1: "#fafafa",
    ink2: "#d4d4d8",
    ink3: "#a1a1aa",
    primary: "oklch(0.6 0.15 250)",
    glass: "rgba(24, 24, 27, 0.7)", // semi-transparent surface1
  }
} as const;
