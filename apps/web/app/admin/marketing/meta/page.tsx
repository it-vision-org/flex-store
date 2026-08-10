import { Suspense } from "react";
import { Skeleton } from "@/components/admin/Skeleton";
import { MetaMarketingContent } from "./MetaMarketingContent";

function MetaSettingsSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72" />
          <Skeleton className="mt-3 h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function MetaMarketingPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Marketing &amp; Tracking — Meta Ads</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Connect your own Meta (Facebook &amp; Instagram) Dataset to track ad conversions for
          your store. This is your own Meta Business account — the developer never has access
          to it.
        </p>
      </div>

      <Suspense fallback={<MetaSettingsSkeleton />}>
        <MetaMarketingContent />
      </Suspense>
    </div>
  );
}
