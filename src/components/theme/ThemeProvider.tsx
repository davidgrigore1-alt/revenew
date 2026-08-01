"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ACCENT_THEME_STORAGE_KEY,
  WORKSPACE_IDENTITY_STORAGE_KEY,
  accentThemePresets,
  defaultAccentTheme,
  getAccentThemePreset,
  isAccentThemeId,
  normalizeWorkspaceIdentityPreview,
  type AccentThemeId,
  type WorkspaceIdentityPreview
} from "@/lib/theme-presets";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  accentTheme: AccentThemeId;
  setAccentTheme: (theme: AccentThemeId) => void;
  identityPreview: WorkspaceIdentityPreview | null;
  setIdentityPreview: (identity: WorkspaceIdentityPreview) => void;
  resetIdentityPreview: () => void;
  personalizationReady: boolean;
};

const storageKey = "revenew-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.theme = theme;
  return resolvedTheme;
}

function applyAccentTheme(theme: AccentThemeId) {
  const preset = getAccentThemePreset(theme);
  document.documentElement.dataset.accentTheme = preset.id;
  for (const [name, value] of Object.entries(preset.tokens)) {
    document.documentElement.style.setProperty(name, value);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [accentTheme, setAccentThemeState] = useState<AccentThemeId>(defaultAccentTheme);
  const [identityPreview, setIdentityPreviewState] = useState<WorkspaceIdentityPreview | null>(null);
  const [personalizationReady, setPersonalizationReady] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
    const initialTheme = storedTheme && ["light", "dark", "system"].includes(storedTheme) ? storedTheme : "system";
    const storedAccent = window.localStorage.getItem(ACCENT_THEME_STORAGE_KEY);
    const initialAccent = isAccentThemeId(storedAccent) ? storedAccent : defaultAccentTheme;
    let storedIdentity: WorkspaceIdentityPreview | null = null;
    try {
      storedIdentity = normalizeWorkspaceIdentityPreview(JSON.parse(window.localStorage.getItem(WORKSPACE_IDENTITY_STORAGE_KEY) ?? "null"));
    } catch {
      storedIdentity = null;
    }
    setThemeState(initialTheme);
    setResolvedTheme(applyTheme(initialTheme));
    setAccentThemeState(initialAccent);
    applyAccentTheme(initialAccent);
    setIdentityPreviewState(storedIdentity);
    setPersonalizationReady(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      if ((window.localStorage.getItem(storageKey) ?? "system") === "system") {
        setResolvedTheme(applyTheme("system"));
      }
    };

    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    accentTheme,
    identityPreview,
    personalizationReady,
    setTheme(nextTheme) {
      window.localStorage.setItem(storageKey, nextTheme);
      setThemeState(nextTheme);
      setResolvedTheme(applyTheme(nextTheme));
    },
    setAccentTheme(nextTheme) {
      if (!accentThemePresets.some((preset) => preset.id === nextTheme)) return;
      window.localStorage.setItem(ACCENT_THEME_STORAGE_KEY, nextTheme);
      setAccentThemeState(nextTheme);
      applyAccentTheme(nextTheme);
    },
    setIdentityPreview(nextIdentity) {
      const normalized = normalizeWorkspaceIdentityPreview(nextIdentity);
      if (!normalized) return;
      window.localStorage.setItem(WORKSPACE_IDENTITY_STORAGE_KEY, JSON.stringify(normalized));
      setIdentityPreviewState(normalized);
    },
    resetIdentityPreview() {
      window.localStorage.removeItem(WORKSPACE_IDENTITY_STORAGE_KEY);
      setIdentityPreviewState(null);
    }
  }), [accentTheme, identityPreview, personalizationReady, resolvedTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return context;
}
