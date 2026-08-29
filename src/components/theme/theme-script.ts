import { ACCENT_THEME_STORAGE_KEY, accentThemePresets, defaultAccentTheme } from "@/lib/theme-presets";

export function themeInitScript() {
  const accentThemes = Object.fromEntries(accentThemePresets.map((preset) => [preset.id, preset.tokens]));
  return `
    (function() {
      try {
        var key = "revenew-theme";
        var stored = window.localStorage.getItem(key) || "light";
        var resolved = stored === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : stored;
        document.documentElement.classList.toggle("dark", resolved === "dark");
        document.documentElement.dataset.theme = stored;
        var accentKey = ${JSON.stringify(ACCENT_THEME_STORAGE_KEY)};
        var accentThemes = ${JSON.stringify(accentThemes)};
        var storedAccent = window.localStorage.getItem(accentKey) || ${JSON.stringify(defaultAccentTheme)};
        var accent = accentThemes[storedAccent] ? storedAccent : ${JSON.stringify(defaultAccentTheme)};
        var accentTokens = accentThemes[accent];
        Object.keys(accentTokens).forEach(function(name) {
          document.documentElement.style.setProperty(name, accentTokens[name]);
        });
        document.documentElement.dataset.accentTheme = accent;
      } catch (error) {
        document.documentElement.classList.remove("dark");
        document.documentElement.dataset.theme = "light";
        document.documentElement.dataset.accentTheme = ${JSON.stringify(defaultAccentTheme)};
      }
    })();
  `;
}
