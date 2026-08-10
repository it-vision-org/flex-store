"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@shoestore/db";
import { encryptSecret } from "@shoestore/utils/crypto";
import { getCurrentUser } from "@/lib/session";
import { getMetaServerConfig, sendMetaCapiEvent, buildUserData } from "@/lib/tracking/meta/server";
import type { ActionResult, MetaAdminSettings, MetaSettingsInput } from "@/types";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

// This feature stores a secret (the CAPI access token), so — unlike most other admin
// server actions in this codebase, which rely solely on middleware.ts protecting /admin/* —
// the two mutating actions below re-check the caller's role explicitly as defense in depth.
async function requireAdmin(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.has(user.role)) return "Unauthorized";
  return null;
}

async function getOrCreate() {
  const existing = await db.storeSettings.findFirst();
  if (existing) return existing;
  return db.storeSettings.create({ data: {} });
}

export async function getMetaSettings(): Promise<ActionResult<MetaAdminSettings>> {
  try {
    const settings = await db.storeSettings.findFirst({
      select: {
        metaEnabled: true,
        metaPixelId: true,
        metaCapiEnabled: true,
        metaCapiAccessToken: true,
        metaAdvancedMatching: true,
        metaTestEventCode: true,
        metaLastTestAt: true,
        metaLastTestStatus: true,
        metaLastTestMessage: true,
      },
    });

    return {
      success: true,
      data: {
        metaEnabled: settings?.metaEnabled ?? false,
        metaPixelId: settings?.metaPixelId ?? null,
        metaCapiEnabled: settings?.metaCapiEnabled ?? false,
        metaTokenConfigured: !!settings?.metaCapiAccessToken,
        metaAdvancedMatching: settings?.metaAdvancedMatching ?? false,
        metaTestEventCode: settings?.metaTestEventCode ?? null,
        metaLastTestAt: settings?.metaLastTestAt ? settings.metaLastTestAt.toISOString() : null,
        metaLastTestStatus: (settings?.metaLastTestStatus as "success" | "error" | null) ?? null,
        metaLastTestMessage: settings?.metaLastTestMessage ?? null,
      },
    };
  } catch (error) {
    console.error("[META SETTINGS] get error:", error);
    return { success: false, error: "Failed to load Meta settings" };
  }
}

export async function saveMetaSettings(data: MetaSettingsInput): Promise<ActionResult> {
  const authError = await requireAdmin();
  if (authError) return { success: false, error: authError };

  try {
    const pixelId = data.metaPixelId.trim();
    if (data.metaEnabled) {
      if (!pixelId) return { success: false, error: "Pixel / Dataset ID is required to enable Meta tracking." };
      if (!/^\d{5,20}$/.test(pixelId)) {
        return { success: false, error: "Pixel / Dataset ID should contain only digits." };
      }
    }

    const settings = await getOrCreate();

    const newToken = data.metaAccessToken?.trim();
    if (data.metaCapiEnabled && !newToken && !settings.metaCapiAccessToken) {
      return {
        success: false,
        error: "A Conversions API Access Token is required to enable the Conversions API.",
      };
    }

    await db.storeSettings.update({
      where: { id: settings.id },
      data: {
        metaEnabled: data.metaEnabled,
        metaPixelId: pixelId || null,
        metaCapiEnabled: data.metaCapiEnabled,
        metaAdvancedMatching: data.metaAdvancedMatching,
        metaTestEventCode: data.metaTestEventCode.trim() || null,
        // Only touch the token column when the admin actually typed a replacement —
        // an empty field must never wipe out an already-configured token.
        ...(newToken ? { metaCapiAccessToken: encryptSecret(newToken) } : {}),
      },
    });

    // The root layout reads metaEnabled/metaPixelId via a cached getStoreSettings() call —
    // without this, the storefront keeps serving pre-save config and the Pixel never loads.
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("[META SETTINGS] save error:", error);
    return { success: false, error: "Failed to save Meta settings" };
  }
}

export async function testMetaConnection(): Promise<ActionResult<{ message: string }>> {
  const authError = await requireAdmin();
  if (authError) return { success: false, error: authError };

  try {
    const settings = await getOrCreate();

    async function recordResult(status: "success" | "error", message: string) {
      await db.storeSettings.update({
        where: { id: settings.id },
        data: { metaLastTestAt: new Date(), metaLastTestStatus: status, metaLastTestMessage: message },
      });
    }

    if (!settings.metaEnabled) {
      const message = "Meta tracking is disabled — enable it before testing.";
      await recordResult("error", message);
      return { success: false, error: message };
    }
    if (!settings.metaPixelId) {
      const message = "Pixel / Dataset ID is missing.";
      await recordResult("error", message);
      return { success: false, error: message };
    }
    if (!settings.metaCapiEnabled || !settings.metaCapiAccessToken) {
      const message = "Conversions API Access Token is missing.";
      await recordResult("error", message);
      return { success: false, error: message };
    }

    const config = await getMetaServerConfig();
    if (!config || !config.accessToken) {
      const message = "Conversions API Access Token is missing.";
      await recordResult("error", message);
      return { success: false, error: message };
    }

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") ?? "ShoeStore-Admin-TestConnection";
    const clientIp = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";

    const result = await sendMetaCapiEvent({
      config,
      eventName: "PageView",
      eventId: `test_${Date.now()}`,
      eventSourceUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://example.com",
      userData: buildUserData({ clientIp, userAgent }),
    });

    if (result.success) {
      const message = config.testEventCode
        ? "Test event sent successfully — check the Test Events tab in Meta Events Manager."
        : "Test event sent successfully — it will appear as a real event in Meta Events Manager (no Test Event Code set).";
      await recordResult("success", message);
      return { success: true, data: { message } };
    }

    const message = "Meta authentication failed. Double-check your Access Token.";
    await recordResult("error", message);
    return { success: false, error: message };
  } catch (error) {
    console.error("[META SETTINGS] testConnection error:", error);
    return { success: false, error: "Failed to test the Meta connection" };
  }
}
