import { useEffect, useState } from "react";
import { themes, DEFAULT_THEME, type Theme } from "../lib/themes";

const STORAGE_KEY = "rippd-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute("data-theme", theme.id);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return themes.find((t) => t.id === saved) ?? DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = themes.find((t) => t.id === saved) ?? DEFAULT_THEME;
    applyTheme(initial);
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t.id);
    setThemeState(t);
  };

  return { theme, setTheme, themes };
}
