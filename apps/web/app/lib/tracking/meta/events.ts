import { CURRENCY } from "@/lib/tracking/types";
import type {
  AddToCartPayload,
  InitiateCheckoutPayload,
  PurchasePayload,
  SearchPayload,
  ViewContentPayload,
} from "@/lib/tracking/types";

export function viewContentCustomData(payload: ViewContentPayload) {
  return {
    content_ids: payload.contentIds,
    content_name: payload.contentName,
    content_type: "product",
    ...(payload.categoryName ? { content_category: payload.categoryName } : {}),
    value: payload.value,
    currency: CURRENCY,
  };
}

export function searchCustomData(payload: SearchPayload) {
  return { search_string: payload.searchQuery };
}

export function addToCartCustomData(payload: AddToCartPayload) {
  return {
    content_ids: payload.contentIds,
    contents: payload.contents.map((c) => ({ id: c.id, quantity: c.quantity, item_price: c.itemPrice })),
    content_name: payload.contentName,
    content_type: "product",
    value: payload.value,
    currency: CURRENCY,
  };
}

export function initiateCheckoutCustomData(payload: InitiateCheckoutPayload) {
  return {
    content_ids: payload.contentIds,
    contents: payload.contents.map((c) => ({ id: c.id, quantity: c.quantity, item_price: c.itemPrice })),
    content_type: "product",
    num_items: payload.numItems,
    value: payload.value,
    currency: CURRENCY,
  };
}

export function purchaseCustomData(payload: PurchasePayload) {
  return {
    content_ids: payload.contentIds,
    contents: payload.contents.map((c) => ({ id: c.id, quantity: c.quantity, item_price: c.itemPrice })),
    content_type: "product",
    value: payload.value,
    currency: CURRENCY,
    order_id: payload.orderId,
  };
}
