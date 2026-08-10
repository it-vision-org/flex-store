"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, ExternalLink, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { saveMetaSettings, testMetaConnection } from "@/actions/metaSettingsActions";
import type { MetaAdminSettings, MetaSettingsInput } from "@/types";
import { Field, SaveButton, inp } from "./HeroTextEditor";

const META_EVENTS_MANAGER_URL = "https://business.facebook.com/events_manager2";

type FormState = {
  metaEnabled: boolean;
  metaPixelId: string;
  metaCapiEnabled: boolean;
  metaAdvancedMatching: boolean;
  metaTestEventCode: string;
};

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-[var(--color-muted)]">{desc}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-[var(--color-accent)]"
      />
      <span>
        <span className="block text-sm font-semibold text-[var(--color-text)]">{label}</span>
        {desc && <span className="block text-xs text-[var(--color-muted)]">{desc}</span>}
      </span>
    </label>
  );
}

function StatusRow({ label, status }: { label: string; status: "active" | "disabled" | "error" | "not-configured" }) {
  const dot = { active: "bg-emerald-500", disabled: "bg-gray-300", error: "bg-red-500", "not-configured": "bg-amber-400" }[
    status
  ];
  const text = {
    active: "Active",
    disabled: "Disabled",
    error: "Configuration error",
    "not-configured": "Not configured",
  }[status];
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-3 last:border-0">
      <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>
      <span className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {text}
      </span>
    </div>
  );
}

export function MetaSettingsClient({ initial }: { initial: MetaAdminSettings }) {
  const [form, setForm] = useState<FormState>({
    metaEnabled: initial.metaEnabled,
    metaPixelId: initial.metaPixelId ?? "",
    metaCapiEnabled: initial.metaCapiEnabled,
    metaAdvancedMatching: initial.metaAdvancedMatching,
    metaTestEventCode: initial.metaTestEventCode ?? "",
  });
  const [tokenConfigured, setTokenConfigured] = useState(initial.metaTokenConfigured);
  const [replacingToken, setReplacingToken] = useState(!initial.metaTokenConfigured);
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [diagnostics, setDiagnostics] = useState({
    lastTestAt: initial.metaLastTestAt,
    lastTestStatus: initial.metaLastTestStatus,
    lastTestMessage: initial.metaLastTestMessage,
  });

  const [pending, startTransition] = useTransition();
  const [testing, startTestTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const pixelIdRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError("");
    const pixelId = form.metaPixelId.trim();
    if (form.metaEnabled && !pixelId) {
      setError("Pixel / Dataset ID is required to enable Meta tracking.");
      return;
    }
    if (form.metaCapiEnabled && !tokenConfigured && !tokenInput.trim()) {
      setError("A Conversions API Access Token is required to enable the Conversions API.");
      return;
    }

    const payload: MetaSettingsInput = {
      ...form,
      metaAccessToken: tokenInput.trim() || undefined,
    };

    startTransition(async () => {
      const res = await saveMetaSettings(payload);
      if (res.success) {
        setSaved(true);
        if (tokenInput.trim()) {
          setTokenConfigured(true);
          setReplacingToken(false);
          setTokenInput("");
        }
      } else {
        setError(res.error ?? "Failed to save");
      }
    });
  }

  function handleTestConnection() {
    setError("");
    startTestTransition(async () => {
      const res = await testMetaConnection();
      const nowIso = new Date().toISOString();
      if (res.success) {
        setDiagnostics({ lastTestAt: nowIso, lastTestStatus: "success", lastTestMessage: res.data!.message });
      } else {
        setDiagnostics({ lastTestAt: nowIso, lastTestStatus: "error", lastTestMessage: res.error ?? "Test failed" });
        setError(res.error ?? "Test failed");
      }
    });
  }

  const pixelStatus: "active" | "disabled" | "not-configured" = !form.metaEnabled
    ? "disabled"
    : form.metaPixelId.trim()
      ? "active"
      : "not-configured";

  const capiStatus: "active" | "disabled" | "error" | "not-configured" =
    !form.metaEnabled || !form.metaCapiEnabled
      ? "disabled"
      : !tokenConfigured && !tokenInput.trim()
        ? "not-configured"
        : diagnostics.lastTestStatus === "error"
          ? "error"
          : "active";

  const isUnconfigured = !initial.metaPixelId && !initial.metaEnabled;

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {isUnconfigured && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 p-6 text-center space-y-2">
          <p className="font-bold text-[var(--color-text)]">Meta tracking is not configured yet.</p>
          <p className="text-sm text-[var(--color-muted)]">
            Connect your Meta Dataset to start tracking Facebook and Instagram advertising conversions.
          </p>
          <button
            type="button"
            onClick={() => pixelIdRef.current?.focus()}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-green-mid)]"
          >
            Configure Meta
          </button>
        </div>
      )}

      {/* Integration */}
      <Card title="Integration" desc="Turn on Meta tracking and connect your Dataset.">
        <div className="space-y-4">
          <Toggle
            checked={form.metaEnabled}
            onChange={(v) => set("metaEnabled", v)}
            label="Enable Meta tracking"
            desc="Loads the Meta Pixel on your storefront and allows server-side events."
          />

          <Field label="Pixel / Dataset ID">
            <input
              ref={pixelIdRef}
              value={form.metaPixelId}
              onChange={(e) => set("metaPixelId", e.target.value)}
              placeholder="e.g. 1234567890123456"
              className={inp}
              inputMode="numeric"
            />
          </Field>

          <Toggle
            checked={form.metaCapiEnabled}
            onChange={(v) => set("metaCapiEnabled", v)}
            label="Conversions API"
            desc="Sends purchase and other events directly from our server for more reliable tracking."
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Conversions API Access Token
            </label>
            {tokenConfigured && !replacingToken ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5">
                <span className="flex-1 font-mono text-sm text-[var(--color-muted)]">••••••••••••••••••</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Configured
                </span>
                <button
                  type="button"
                  onClick={() => setReplacingToken(true)}
                  className="shrink-0 text-xs font-semibold text-[var(--color-accent)] hover:underline"
                >
                  Replace token
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your Conversions API Access Token"
                  autoComplete="off"
                  className={`${inp} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            <p className="text-xs text-[var(--color-muted)]">Keep your Conversions API Access Token private.</p>
          </div>

          <Toggle
            checked={form.metaAdvancedMatching}
            onChange={(v) => set("metaAdvancedMatching", v)}
            label="Advanced Matching"
            desc="Improves ad attribution using hashed customer data (email, phone, name) when available."
          />

          <Field label="Test Event Code — testing only, optional">
            <input
              value={form.metaTestEventCode}
              onChange={(e) => set("metaTestEventCode", e.target.value)}
              placeholder="e.g. TEST12345"
              className={inp}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end border-t border-[var(--color-border)] pt-5">
          <SaveButton pending={pending} saved={saved} onClick={handleSave} />
        </div>
      </Card>

      {/* How to configure Meta */}
      <Card title="How to configure Meta">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[var(--color-accent)]">
            Where do I find these values?
            <Sparkles className="h-4 w-4 shrink-0 transition group-open:rotate-12" />
          </summary>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[var(--color-text)]">
            <li>Open Meta Events Manager.</li>
            <li>Select or create the Dataset / Pixel for your website.</li>
            <li>Copy the Pixel / Dataset ID and paste it into the field above.</li>
            <li>Open the Dataset settings and find the Conversions API section.</li>
            <li>Generate a Conversions API Access Token.</li>
            <li>Paste the token into the Access Token field above.</li>
            <li>Save the configuration.</li>
            <li>Open Test Events in Meta Events Manager to verify events are being received.</li>
            <li>Optional: copy the Test Event Code from Meta Events Manager and paste it above.</li>
          </ol>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Keep your Conversions API Access Token private — never share it publicly.
          </p>
          <a
            href={META_EVENTS_MANAGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:underline"
          >
            Open Meta Events Manager <ExternalLink className="h-3 w-3" />
          </a>
        </details>
      </Card>

      {/* Diagnostics */}
      <Card title="Diagnostics">
        <div>
          <StatusRow label="Meta Pixel" status={pixelStatus} />
          <StatusRow label="Conversions API" status={capiStatus} />
        </div>

        {diagnostics.lastTestAt && (
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Last test: {new Date(diagnostics.lastTestAt).toLocaleString()} —{" "}
            <span className={diagnostics.lastTestStatus === "error" ? "text-red-600" : "text-emerald-600"}>
              {diagnostics.lastTestMessage}
            </span>
          </p>
        )}

        <div className="mt-5 flex justify-end border-t border-[var(--color-border)] pt-5">
          <button
            type="button"
            disabled={testing}
            onClick={handleTestConnection}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10 disabled:opacity-60"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      </Card>
    </div>
  );
}
