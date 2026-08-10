"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbqAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/** Fires a standard Meta Pixel event. Guarded/try-caught — never throws, never blocks the caller. */
export function metaTrack(eventName: string, params?: Record<string, unknown>, eventId?: string): void {
  if (!fbqAvailable()) return;
  try {
    if (eventId) {
      window.fbq!("track", eventName, params ?? {}, { eventID: eventId });
    } else {
      window.fbq!("track", eventName, params ?? {});
    }
  } catch (error) {
    console.error("[META PIXEL] track error:", error);
  }
}

export function metaPageView(): void {
  if (!fbqAvailable()) return;
  try {
    window.fbq!("track", "PageView");
  } catch (error) {
    console.error("[META PIXEL] PageView error:", error);
  }
}

/** Advanced Matching — Meta's JS SDK hashes these client-side before sending. Raw values only. */
export function setMetaAdvancedMatching(userData: { email?: string; phone?: string }): void {
  if (!fbqAvailable()) return;
  try {
    window.fbq!("set", "userData", userData);
  } catch (error) {
    console.error("[META PIXEL] setUserData error:", error);
  }
}
