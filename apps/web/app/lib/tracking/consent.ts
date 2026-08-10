/**
 * Integration seam for a future consent-management system.
 *
 * This project currently has no cookie banner / consent system at all (verified —
 * no consent, cookie-banner, or GDPR code exists anywhere in the codebase). Marketing
 * tracking (Meta Pixel + CAPI) always runs when enabled by the admin. Once a real
 * consent system is built, gate marketing tracking by changing only this function —
 * every tracking call site already goes through it.
 */
export function hasMarketingConsent(): boolean {
  return true;
}
