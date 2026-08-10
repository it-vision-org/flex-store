import { createHash } from "crypto";
import { db } from "@shoestore/db";
import { decryptSecret } from "@shoestore/utils/crypto";

const GRAPH_API_VERSION = "v21.0";

export type MetaServerConfig = {
  enabled: boolean;
  capiEnabled: boolean;
  pixelId: string;
  accessToken: string | null;
  advancedMatching: boolean;
  testEventCode: string | null;
};

/** Server-only — decrypts the CAPI access token. Never pass the result to a client component. */
export async function getMetaServerConfig(): Promise<MetaServerConfig | null> {
  const settings = await db.storeSettings.findFirst({
    select: {
      metaEnabled: true,
      metaPixelId: true,
      metaCapiEnabled: true,
      metaCapiAccessToken: true,
      metaAdvancedMatching: true,
      metaTestEventCode: true,
    },
  });
  if (!settings || !settings.metaEnabled || !settings.metaPixelId) return null;

  return {
    enabled: settings.metaEnabled,
    capiEnabled: settings.metaCapiEnabled,
    pixelId: settings.metaPixelId,
    accessToken: settings.metaCapiAccessToken ? decryptSecret(settings.metaCapiAccessToken) : null,
    advancedMatching: settings.metaAdvancedMatching,
    testEventCode: settings.metaTestEventCode?.trim() || null,
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Meta's normalization rule: trim + lowercase before hashing. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  // E.164-ish digits only, no leading '+', per Meta's Advanced Matching requirements.
  return value.replace(/[^\d]/g, "");
}

export type MetaUserDataInput = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  externalId?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

/** Meta CAPI user_data object — PII fields SHA-256 hashed, identifiers/network fields sent as-is. */
export function buildUserData(input: MetaUserDataInput): Record<string, string> {
  const userData: Record<string, string> = {};
  if (input.email) userData.em = sha256(normalize(input.email));
  if (input.phone) userData.ph = sha256(normalizePhone(input.phone));
  if (input.firstName) userData.fn = sha256(normalize(input.firstName));
  if (input.lastName) userData.ln = sha256(normalize(input.lastName));
  if (input.city) userData.ct = sha256(normalize(input.city).replace(/\s+/g, ""));
  if (input.externalId) userData.external_id = input.externalId;
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;
  return userData;
}

export type SendMetaCapiEventParams = {
  config: MetaServerConfig;
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData: Record<string, string>;
  customData?: Record<string, unknown>;
};

/**
 * Fire-and-forget by contract: never throws. Callers decide whether to await it.
 * Never logs the access token or unhashed customer data.
 */
export async function sendMetaCapiEvent(
  params: SendMetaCapiEventParams,
): Promise<{ success: boolean; error?: string }> {
  const { config, eventName, eventId, eventSourceUrl, userData, customData } = params;
  if (!config.accessToken) return { success: false, error: "No access token configured" };

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: userData,
        ...(customData ? { custom_data: customData } : {}),
      },
    ],
    ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.pixelId}/events?access_token=${encodeURIComponent(config.accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const message = errBody?.error?.message || `Meta API responded with ${res.status}`;
      console.error(`[META CAPI] ${eventName} rejected:`, message);
      return { success: false, error: message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    console.error(`[META CAPI] ${eventName} error:`, message);
    return { success: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
