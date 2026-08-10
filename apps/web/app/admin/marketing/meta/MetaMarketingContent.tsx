import { getMetaSettings } from "@/actions/metaSettingsActions";
import { MetaSettingsClient } from "@/components/admin/MetaSettingsClient";

export async function MetaMarketingContent() {
  const result = await getMetaSettings();
  if (!result.success || !result.data) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load Meta settings.
      </p>
    );
  }

  return <MetaSettingsClient initial={result.data} />;
}
