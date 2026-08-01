export const DISMISSED_GUIDE_PREFIX = "revenew.dismissedGuide.";
export const GUIDE_RESET_EVENT = "revenew:reset-dismissed-guides";

export function isGuideDismissed(guideId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(`${DISMISSED_GUIDE_PREFIX}${guideId}`) === "true";
}

export function dismissGuide(guideId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${DISMISSED_GUIDE_PREFIX}${guideId}`, "true");
}

export function resetDismissedGuides() {
  if (typeof window === "undefined") return 0;
  const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key?.startsWith(DISMISSED_GUIDE_PREFIX)));
  keys.forEach((key) => window.localStorage.removeItem(key));
  window.dispatchEvent(new Event(GUIDE_RESET_EVENT));
  return keys.length;
}
