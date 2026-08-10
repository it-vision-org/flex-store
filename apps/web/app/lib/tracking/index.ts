"use client";

import { CURRENCY } from "@/lib/tracking/types";
import type {
  AddToCartPayload,
  InitiateCheckoutPayload,
  PurchasePayload,
  SearchPayload,
  ViewContentPayload,
} from "@/lib/tracking/types";
import { hasMarketingConsent } from "@/lib/tracking/consent";
import { metaPageView, metaTrack, setMetaAdvancedMatching } from "@/lib/tracking/meta/client";
import {
  addToCartCustomData,
  initiateCheckoutCustomData,
  purchaseCustomData,
  searchCustomData,
  viewContentCustomData,
} from "@/lib/tracking/meta/events";

// Application code (product pages, cart, checkout) calls these generic functions and never
// touches Meta internals directly — this is the seam a future provider (GA, TikTok, ...)
// would plug into without any ecommerce call site changing.

function newEventId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Redundant server-side CAPI delivery for a browser-originated event. Never blocks, never throws. */
function dispatchCapi(eventName: string, eventId: string, customData: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/tracking/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ eventName, eventId, customData, eventSourceUrl: window.location.href }),
    }).catch(() => {});
  } catch {
    // best-effort only
  }
}

export function trackPageView(): void {
  if (!hasMarketingConsent()) return;
  metaPageView();
}

export function trackViewContent(payload: ViewContentPayload): void {
  if (!hasMarketingConsent()) return;
  const eventId = newEventId("viewcontent");
  const customData = viewContentCustomData(payload);
  metaTrack("ViewContent", customData, eventId);
  dispatchCapi("ViewContent", eventId, customData);
}

export function trackSearch(payload: SearchPayload): void {
  if (!hasMarketingConsent() || !payload.searchQuery.trim()) return;
  const eventId = newEventId("search");
  const customData = searchCustomData(payload);
  metaTrack("Search", customData, eventId);
  dispatchCapi("Search", eventId, customData);
}

export function trackAddToCart(payload: AddToCartPayload): void {
  if (!hasMarketingConsent()) return;
  const eventId = newEventId("addtocart");
  const customData = addToCartCustomData(payload);
  metaTrack("AddToCart", customData, eventId);
  dispatchCapi("AddToCart", eventId, customData);
}

export function trackInitiateCheckout(payload: InitiateCheckoutPayload): void {
  if (!hasMarketingConsent()) return;
  const eventId = newEventId("initiatecheckout");
  const customData = initiateCheckoutCustomData(payload);
  metaTrack("InitiateCheckout", customData, eventId);
  dispatchCapi("InitiateCheckout", eventId, customData);
}

/**
 * Purchase — browser Pixel only. The authoritative Conversions API Purchase is sent
 * server-side inside orderActions.createOrder() the instant the order is created, using the
 * same deterministic `purchase_<orderId>` event id, so Meta dedupes the two into one conversion.
 */
export function trackPurchase(payload: PurchasePayload): void {
  if (!hasMarketingConsent()) return;
  const eventId = `purchase_${payload.orderId}`;
  metaTrack("Purchase", purchaseCustomData(payload), eventId);
}

export function setAdvancedMatchingUserData(userData: { email?: string; phone?: string }): void {
  if (!hasMarketingConsent()) return;
  setMetaAdvancedMatching(userData);
}

export { CURRENCY };
