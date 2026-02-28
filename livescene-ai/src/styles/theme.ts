export const theme = {
  colors: {
    // Brand
    brand: "#6C63FF",
    brandLight: "#8B85FF",
    brandDark: "#4B44CC",

    // Neon accents
    neonCyan: "#00F5FF",
    neonPurple: "#BF5AF2",
    neonGreen: "#32D74B",
    neonOrange: "#FF9F0A",
    neonRed: "#FF453A",

    // Dark backgrounds
    bg900: "#0A0A0F",
    bg800: "#111118",
    bg700: "#1A1A27",
    bg600: "#242433",
    bg500: "#2E2E42",
    bg400: "#3D3D55",

    // Text
    textPrimary: "#F0F0FF",
    textSecondary: "#A0A0C0",
    textMuted: "#606080",

    // Glass
    glass: "rgba(255,255,255,0.05)",
    glassBorder: "rgba(255,255,255,0.08)",
  },

  fonts: {
    sans: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
    display: '"Syne", "Inter", sans-serif',
  },

  // Object class colors for bounding boxes
  objectColors: {
    person: "#6C63FF",
    car: "#00F5FF",
    phone: "#32D74B",
    laptop: "#FF9F0A",
    chair: "#BF5AF2",
    dog: "#FF6B9D",
    cat: "#FFD60A",
    bottle: "#00C7BE",
    cup: "#FF453A",
    book: "#30D158",
    default: "#8E8EA0",
  } as Record<string, string>,

  glows: {
    brand: "0 0 20px rgba(108,99,255,0.4)",
    cyan: "0 0 20px rgba(0,245,255,0.3)",
    green: "0 0 20px rgba(50,215,75,0.3)",
    red: "0 0 20px rgba(255,69,58,0.3)",
  },

  transitions: {
    fast: "150ms ease",
    normal: "250ms ease",
    slow: "400ms ease",
  },
} as const;

export type Theme = typeof theme;
export default theme;
