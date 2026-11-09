/**
 * Privacy-first analytics seam. Nothing is sent anywhere by default.
 * To wire a provider later (e.g. Plausible), assign `window.skyboundAnalytics`
 * a function `(event, props) => void` before the app loads.
 */
type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    skyboundAnalytics?: (event: string, props?: Props) => void;
  }
}

export function track(event: string, props?: Props) {
  try {
    if (typeof window !== "undefined" && typeof window.skyboundAnalytics === "function") {
      window.skyboundAnalytics(event, props);
    } else if (import.meta.env?.DEV && typeof console !== "undefined") {
      console.debug(`[analytics] ${event}`, props ?? "");
    }
  } catch {
    /* analytics must never break the game */
  }
}
