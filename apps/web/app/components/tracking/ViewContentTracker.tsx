"use client";

import { useEffect, useRef } from "react";
import { trackViewContent } from "@/lib/tracking";

type Props = {
  productId: string;
  productName: string;
  categoryName?: string | null;
  price: number;
};

export function ViewContentTracker({ productId, productName, categoryName, price }: Props) {
  // Guards against React Strict Mode's dev-only double effect invocation, which would
  // otherwise fire two ViewContent events (each with its own random event id) per view.
  const firedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (firedForRef.current === productId) return;
    firedForRef.current = productId;
    trackViewContent({
      contentIds: [productId],
      contentName: productName,
      categoryName,
      value: price,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
