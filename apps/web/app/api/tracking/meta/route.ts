import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getMetaServerConfig, sendMetaCapiEvent, buildUserData } from "@/lib/tracking/meta/server";

const ALLOWED_EVENTS = new Set(["ViewContent", "Search", "AddToCart", "InitiateCheckout"]);

// Server-side CAPI delivery for browser-originated events (Purchase is handled separately,
// authoritatively, inside orderActions.createOrder — never routed through here).
// Always responds 200 — this is a best-effort side channel and must never surface as an
// error to the calling page.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ skipped: true });

    const { eventName, eventId, customData, eventSourceUrl } = body as {
      eventName?: string;
      eventId?: string;
      customData?: Record<string, unknown>;
      eventSourceUrl?: string;
    };

    if (!eventName || !ALLOWED_EVENTS.has(eventName) || !eventId || !eventSourceUrl) {
      return NextResponse.json({ skipped: true });
    }

    const config = await getMetaServerConfig();
    if (!config || !config.capiEnabled || !config.accessToken) {
      return NextResponse.json({ skipped: true });
    }

    const fbp = req.cookies.get("_fbp")?.value;
    const fbc = req.cookies.get("_fbc")?.value;
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

    let matchingFields: { email?: string | null; externalId?: string | null } = {};
    if (config.advancedMatching) {
      const user = await getCurrentUser().catch(() => null);
      if (user) matchingFields = { email: user.email, externalId: user.id };
    }

    const userData = buildUserData({
      ...matchingFields,
      clientIp,
      userAgent,
      fbp,
      fbc,
    });

    const result = await sendMetaCapiEvent({
      config,
      eventName,
      eventId,
      eventSourceUrl,
      userData,
      customData,
    });

    return NextResponse.json({ delivered: result.success });
  } catch (error) {
    console.error("[TRACKING API] meta route error:", error);
    return NextResponse.json({ skipped: true });
  }
}
