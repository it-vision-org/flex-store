// Store has no configurable currency field — TND is hardcoded store-wide (see lib/seo.ts, lib/utils.ts).
export const CURRENCY = "TND";

export type TrackedContent = {
  id: string;
  quantity?: number;
  itemPrice?: number;
};

export type ViewContentPayload = {
  contentIds: string[];
  contentName: string;
  categoryName?: string | null;
  value: number;
};

export type SearchPayload = {
  searchQuery: string;
};

export type AddToCartPayload = {
  contentIds: string[];
  contents: TrackedContent[];
  contentName: string;
  value: number;
};

export type InitiateCheckoutPayload = {
  contentIds: string[];
  contents: TrackedContent[];
  numItems: number;
  value: number;
};

export type PurchasePayload = {
  orderId: string;
  contentIds: string[];
  contents: TrackedContent[];
  value: number;
};

export type StandardEventName =
  | "PageView"
  | "ViewContent"
  | "Search"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";
