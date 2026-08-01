const HIGHLIGHT_ATTRIBUTE = "data-revenew-guide-highlight";
let activeHighlightTimer: number | undefined;

export function highlightGuideAnchor(anchor: string, duration = 4000) {
  if (typeof document === "undefined") return false;
  const target = document.querySelector<HTMLElement>(`[data-guide-anchor="${CSS.escape(anchor)}"]`);
  if (!target) return false;

  if (activeHighlightTimer) window.clearTimeout(activeHighlightTimer);
  document.querySelectorAll<HTMLElement>(`[${HIGHLIGHT_ATTRIBUTE}]`).forEach((element) => element.removeAttribute(HIGHLIGHT_ATTRIBUTE));
  target.setAttribute(HIGHLIGHT_ATTRIBUTE, "true");
  target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  activeHighlightTimer = window.setTimeout(() => {
    target.removeAttribute(HIGHLIGHT_ATTRIBUTE);
    activeHighlightTimer = undefined;
  }, duration);
  return true;
}
