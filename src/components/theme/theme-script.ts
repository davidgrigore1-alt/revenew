export function themeInitScript() {
  return `
    (function() {
      try {
        var key = "revenew-theme";
        var stored = window.localStorage.getItem(key) || "system";
        var resolved = stored === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : stored;
        document.documentElement.classList.toggle("dark", resolved === "dark");
        document.documentElement.dataset.theme = stored;
      } catch (error) {
        document.documentElement.classList.add("dark");
        document.documentElement.dataset.theme = "system";
      }
    })();
  `;
}
