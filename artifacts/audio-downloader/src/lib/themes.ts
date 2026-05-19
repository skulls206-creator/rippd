export interface Theme {
  id: string;
  name: string;
  swatch: string;
  dark: boolean;
  vars: Record<string, string>;
}

// ⚠️  Only the "void" (dark) theme is actively used. Other theme definitions
// (arctic, midnight, sunset, ocean, emerald) have been stripped to reduce
// bundle size. Restore from git history if multi-theme support is re-added.

export const themes: Theme[] = [
  {
    id: "void",
    name: "Void",
    swatch: "linear-gradient(135deg, #9B30FF, #00FFFF)",
    dark: true,
    vars: {
      "--background": "240 10% 4%",
      "--foreground": "0 0% 98%",
      "--card": "240 10% 6%",
      "--card-foreground": "0 0% 98%",
      "--popover": "240 10% 6%",
      "--popover-foreground": "0 0% 98%",
      "--primary": "280 100% 60%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "240 10% 12%",
      "--secondary-foreground": "0 0% 98%",
      "--muted": "240 10% 12%",
      "--muted-foreground": "240 5% 65%",
      "--accent": "180 100% 50%",
      "--accent-foreground": "0 0% 98%",
      "--border": "240 10% 15%",
      "--input": "240 10% 12%",
      "--ring": "280 100% 60%",
      "--glow-opacity": "0.15",
      "--glow-opacity-2": "0.1",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 98%",
      "--glass-bg": "rgba(255,255,255,0.05)",
      "--glass-bg-subtle": "rgba(255,255,255,0.04)",
      "--glass-bg-raised": "rgba(255,255,255,0.08)",
      "--glass-bg-hover": "rgba(255,255,255,0.10)",
      "--glass-bg-active": "rgba(255,255,255,0.12)",
      "--glass-border": "rgba(255,255,255,0.10)",
      "--glass-border-light": "rgba(255,255,255,0.05)",
      "--glass-border-strong": "rgba(255,255,255,0.20)",
      "--glass-text": "rgba(255,255,255,0.70)",
      "--glass-text-muted": "rgba(255,255,255,0.50)",
      "--glass-text-dim": "rgba(255,255,255,0.30)",
    },
  },
];

export const DEFAULT_THEME = themes[0];
