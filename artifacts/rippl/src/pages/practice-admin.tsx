import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Plus, X, Loader2, AlertTriangle, ChevronRight,
  CheckCircle2, Pencil, Globe, DollarSign, CreditCard, Copy, Check,
  Zap, Link2,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ────────────────────────────────────────────────────────────────────

interface Practice {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  status: string;
  plan: string;
  monthly_fee: number;
  per_referral_fee: number;
  reward_value: number;
  twilio_phone_number: string | null;
  sendgrid_from_email: string | null;
  sendgrid_from_name: string | null;
  tango_email_template_id: string | null;
  primary_color: string | null;
  billing_status: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  tier_reward_starter: number | null;
  tier_reward_rippler: number | null;
  tier_reward_super_rippler: number | null;
  tier_reward_legend: number | null;
  created_at: string;
  office_count?: number;
}

// ── Billing status badge ──────────────────────────────────────────────────────

function BillingBadge({ status }: { status: string | null }) {
  const s = status ?? "pending";
  const styles: Record<string, string> = {
    active:  "bg-green-500/10 text-green-600 border-green-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    failed:  "bg-red-500/10 text-red-600 border-red-500/20",
    exempt:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };
  return (
    <span className={cn("text-xs border px-2 py-0.5 rounded-full font-medium capitalize", styles[s] ?? styles.pending)}>
      {s === "active" ? "billing active" : s === "pending" ? "no card" : s}
    </span>
  );
}

// ── Billing panel (inside edit drawer) ────────────────────────────────────────

function BillingPanel({ practice, onBillingError }: { practice: Practice & { id: string }; onBillingError?: (msg: string) => void }) {
  const [copied, setCopied] = useState(false);
  const [chargeResult, setChargeResult] = useState<string | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const setupMut = useMutation({
    mutationFn: () =>
      customFetch<{ url: string; detail?: string }>(`${BASE}/api/billing/create-setup-session`, {
        method: "POST",
        body: JSON.stringify({ practice_id: practice.id }),
      }),
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // Clipboard blocked — prompt to manually copy
        window.prompt("Copy this link and send to the practice owner:", data.url);
      }
    },
    onError: (err) => {
      const detail =
        (err as { data?: { detail?: string; error?: string } } | null)?.data?.detail ??
        (err as { data?: { detail?: string; error?: string } } | null)?.data?.error ??
        (err instanceof Error ? err.message : "Unknown error");
      onBillingError?.(detail);
    },
  });

  const chargeMut = useMutation({
    mutationFn: () =>
      customFetch<{ month: string; results: { name: string; status: string; amount_dollars?: string; referral_count?: number; reason?: string; error?: string }[] }>(
        `${BASE}/api/billing/charge-month`,
        { method: "POST", body: JSON.stringify({ practice_id: practice.id }) }
      ),
    onSuccess: (data) => {
      const r = data.results[0];
      if (!r) { setChargeResult("No result returned."); return; }
      if (r.status === "charged") setChargeResult(`Charged $${r.amount_dollars} for ${r.referral_count} referrals (${data.month}).`);
      else if (r.status === "skipped") setChargeResult(`Skipped: ${r.reason}`);
      else setChargeResult(`Failed: ${r.error}`);
    },
  });

  return (
    <section className="border-t border-border pt-6 mt-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Stripe Billing</h3>
        <BillingBadge status={practice.billing_status} />
      </div>

      <div className="space-y-3">
        {/* Generate setup link */}
        <div className="p-4 rounded-xl bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-3">
            Generate a billing setup link and copy it to your clipboard. Send it to the practice owner to collect their card on file.
          </p>
          <button
            onClick={() => setupMut.mutate()}
            disabled={setupMut.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {setupMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : copied ? (
              <><Check className="w-4 h-4" /> Link copied!</>
            ) : (
              <><Copy className="w-4 h-4" /> Generate & copy setup link</>
            )}
          </button>
          {setupMut.isError && (
            <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-semibold mb-0.5">Failed to generate link</p>
              <p className="text-xs text-destructive/80 font-mono break-all">
                {((setupMut.error as { data?: { detail?: string; error?: string } } | null)?.data?.detail)
                  ?? ((setupMut.error as { data?: { detail?: string; error?: string } } | null)?.data?.error)
                  ?? (setupMut.error instanceof Error ? setupMut.error.message : "Check Stripe config.")}
              </p>
            </div>
          )}
        </div>

        {/* Charge this month */}
        <div className="p-4 rounded-xl bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-3">
            Charge this practice for the current billing period's detected referrals.
            {!practice.stripe_payment_method_id && (
              <span className="text-amber-600 font-medium"> No card on file yet.</span>
            )}
          </p>
          <button
            onClick={() => { setChargeResult(null); chargeMut.mutate(); }}
            disabled={chargeMut.isPending || !practice.stripe_payment_method_id}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-muted/40 disabled:opacity-60 transition-colors"
          >
            {chargeMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <><Zap className="w-4 h-4" /> Charge this month</>
            )}
          </button>
          {chargeResult && (
            <p className="text-xs text-muted-foreground mt-2 font-medium">{chargeResult}</p>
          )}
        </div>

        {/* Stripe IDs for reference */}
        {practice.stripe_customer_id && (
          <div className="text-[10px] text-muted-foreground font-mono space-y-1 px-1">
            <div>Customer: {practice.stripe_customer_id}</div>
            {practice.stripe_payment_method_id && (
              <div>Payment method: {practice.stripe_payment_method_id}</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Vagaro integration panel (inside edit drawer, salon vertical only) ────────

const VAGARO_WEBHOOK_URL = "https://rippl.onrender.com/api/webhooks/vagaro";

function VagaroPanel({ practiceId }: { practiceId: string }) {
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [credResult, setCredResult]       = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [testForm, setTestForm]           = useState({ client_name: "", referral_name: "", client_phone: "" });
  const [testResult, setTestResult]       = useState<{
    matched?: boolean; message?: string; referrer?: { name: string }; action?: string;
  } | null>(null);

  function copyWebhook() {
    navigator.clipboard.writeText(VAGARO_WEBHOOK_URL).then(() => {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    });
  }

  const credMut = useMutation({
    mutationFn: () =>
      customFetch<{ ok: boolean; message?: string; error?: string }>(
        `${BASE}/api/test/vagaro-credentials`,
        { method: "POST", body: JSON.stringify({ practice_id: practiceId }) },
      ),
    onSuccess: (data) => setCredResult(data),
    onError:   (err: any) => setCredResult({ ok: false, error: err?.data?.error ?? "Request failed" }),
  });

  const webhookMut = useMutation({
    mutationFn: () =>
      customFetch<{ matched: boolean; message: string; referrer?: { name: string }; action?: string }>(
        `${BASE}/api/test/vagaro-webhook`,
        { method: "POST", body: JSON.stringify({ practice_id: practiceId, ...testForm }) },
      ),
    onSuccess: (data) => setTestResult(data),
    onError:   (err: any) => setTestResult({ matched: false, message: err?.data?.error ?? "Request failed" }),
  });

  return (
    <section className="border-t border-border pt-6 mt-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Vagaro Integration</h3>

      {/* Webhook URL */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border mb-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Register this endpoint in your Vagaro developer dashboard under <strong>Webhooks</strong>:
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg bg-muted/40 border border-border">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <code className="text-xs font-mono text-foreground truncate">{VAGARO_WEBHOOK_URL}</code>
          </div>
          <button
            type="button"
            onClick={copyWebhook}
            className="shrink-0 p-2 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
          >
            {copiedWebhook ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Test credentials */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border mb-3">
        <p className="text-xs text-muted-foreground mb-3">
          Verify the <code className="font-mono">vagaro_api_key</code> and <code className="font-mono">vagaro_api_secret</code> stored in this practice's <code className="font-mono">integration_config</code>.
        </p>
        <button
          type="button"
          onClick={() => { setCredResult(null); credMut.mutate(); }}
          disabled={credMut.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-muted/40 disabled:opacity-60 transition-colors"
        >
          {credMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test Credentials"}
        </button>
        {credResult && (
          <p className={cn(
            "mt-2 p-3 rounded-lg border text-xs font-medium",
            credResult.ok
              ? "bg-green-500/10 border-green-500/20 text-green-700"
              : "bg-destructive/10 border-destructive/20 text-destructive",
          )}>
            {credResult.ok ? credResult.message : credResult.error}
          </p>
        )}
      </div>

      {/* Send test webhook */}
      <div className="p-4 rounded-xl bg-muted/20 border border-border">
        <p className="text-xs text-muted-foreground mb-3">
          Simulate a completed first-time Vagaro appointment and run the full referral pipeline end-to-end.
        </p>
        <div className="space-y-2 mb-3">
          {(["client_name", "referral_name", "client_phone"] as const).map((k) => (
            <input
              key={k}
              type={k === "client_phone" ? "tel" : "text"}
              placeholder={
                k === "client_name"   ? "New client name (e.g. Jane Smith)" :
                k === "referral_name" ? "Referrer name they gave (e.g. Mary Jones)" :
                                        "Client phone — optional"
              }
              value={testForm[k]}
              onChange={e => setTestForm(f => ({ ...f, [k]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setTestResult(null); webhookMut.mutate(); }}
          disabled={webhookMut.isPending || !testForm.referral_name.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {webhookMut.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
          ) : (
            <><Zap className="w-4 h-4" /> Send Test Webhook</>
          )}
        </button>
        {testResult && (
          <div className={cn(
            "mt-2 p-3 rounded-lg border text-xs",
            testResult.matched
              ? "bg-green-500/10 border-green-500/20 text-green-700"
              : "bg-amber-500/10 border-amber-500/20 text-amber-700",
          )}>
            <p className="font-semibold mb-0.5">{testResult.matched ? "Referral matched!" : "No match found"}</p>
            <p>{testResult.message}</p>
            {testResult.referrer && (
              <p className="mt-1 font-mono">Referrer: {testResult.referrer.name}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

interface PracticeFormData {
  name: string;
  slug: string;
  vertical: string;
  plan: string;
  monthly_fee: string;
  per_referral_fee: string;
  reward_value: string;
  twilio_phone_number: string;
  sendgrid_from_email: string;
  sendgrid_from_name: string;
  tango_email_template_id: string;
  primary_color: string;
  status: string;
  tier_reward_starter: string;
  tier_reward_rippler: string;
  tier_reward_super_rippler: string;
  tier_reward_legend: string;
}

const EMPTY_FORM: PracticeFormData = {
  name: "",
  slug: "",
  vertical: "dental",
  plan: "per_referral",
  monthly_fee: "0",
  per_referral_fee: "20",
  reward_value: "35",
  twilio_phone_number: "",
  sendgrid_from_email: "",
  sendgrid_from_name: "",
  tango_email_template_id: "",
  primary_color: "E0622A",
  status: "active",
  tier_reward_starter: "",
  tier_reward_rippler: "",
  tier_reward_super_rippler: "",
  tier_reward_legend: "",
};

// ── API helpers ───────────────────────────────────────────────────────────────

function fetchPractices(): Promise<Practice[]> {
  return customFetch<Practice[]>(`${BASE}/api/practices`);
}

function createPractice(data: PracticeFormData): Promise<Practice> {
  return customFetch<Practice>(`${BASE}/api/practices`, {
    method: "POST",
    body: JSON.stringify({
      name:                    data.name,
      slug:                    data.slug,
      vertical:                data.vertical,
      plan:                    data.plan,
      monthly_fee:             Number(data.monthly_fee),
      per_referral_fee:        Number(data.per_referral_fee),
      reward_value:            Number(data.reward_value),
      twilio_phone_number:     data.twilio_phone_number || null,
      sendgrid_from_email:     data.sendgrid_from_email || null,
      sendgrid_from_name:      data.sendgrid_from_name || null,
      tango_email_template_id: data.tango_email_template_id || null,
      primary_color:           data.primary_color || "E0622A",
    }),
  });
}

function updatePractice(id: string, data: Partial<PracticeFormData>): Promise<Practice> {
  return customFetch<Practice>(`${BASE}/api/practices/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name:                    data.name,
      status:                  data.status,
      plan:                    data.plan,
      monthly_fee:             data.monthly_fee !== undefined ? Number(data.monthly_fee) : undefined,
      per_referral_fee:        data.per_referral_fee !== undefined ? Number(data.per_referral_fee) : undefined,
      reward_value:            data.reward_value !== undefined ? Number(data.reward_value) : undefined,
      twilio_phone_number:     data.twilio_phone_number ?? null,
      sendgrid_from_email:     data.sendgrid_from_email ?? null,
      sendgrid_from_name:      data.sendgrid_from_name ?? null,
      tango_email_template_id:   data.tango_email_template_id ?? null,
      primary_color:             data.primary_color || null,
      tier_reward_starter:       data.tier_reward_starter !== undefined ? (data.tier_reward_starter || null) : undefined,
      tier_reward_rippler:       data.tier_reward_rippler !== undefined ? (data.tier_reward_rippler || null) : undefined,
      tier_reward_super_rippler: data.tier_reward_super_rippler !== undefined ? (data.tier_reward_super_rippler || null) : undefined,
      tier_reward_legend:        data.tier_reward_legend !== undefined ? (data.tier_reward_legend || null) : undefined,
    }),
  });
}

// ── Practice Form (create / edit drawer) ─────────────────────────────────────

function PracticeForm({
  initial,
  onClose,
  onSaved,
  onBillingError,
}: {
  initial: PracticeFormData & { id?: string };
  onClose: () => void;
  onSaved: () => void;
  onBillingError?: (msg: string) => void;
}) {
  const [form, setForm] = useState<PracticeFormData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isEdit = !!initial.id;

  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: () => createPractice(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/practices"] });
      setSaved(true);
      setTimeout(onSaved, 900);
    },
    onError: (err: any) => setError(err?.data?.error ?? "Failed to create practice"),
  });

  const updateMut = useMutation({
    mutationFn: () => updatePractice(initial.id!, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/practices"] });
      setSaved(true);
      setTimeout(onSaved, 900);
    },
    onError: (err: any) => setError(err?.data?.error ?? "Failed to update practice"),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function set(field: keyof PracticeFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Practice name is required"); return; }
    if (!form.slug.trim() && !isEdit) { setError("Slug is required"); return; }
    isEdit ? updateMut.mutate() : createMut.mutate();
  }

  const field = (
    label: string,
    key: keyof PracticeFormData,
    opts?: { type?: string; placeholder?: string; hint?: string; wide?: boolean; required?: boolean }
  ) => (
    <div className={opts?.wide ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}{opts?.required && <span className="text-destructive ml-1">*</span>}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={form[key]}
        placeholder={opts?.placeholder ?? ""}
        onChange={e => set(key, e.target.value)}
        required={opts?.required}
        className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
      />
      {opts?.hint && <p className="text-xs text-muted-foreground mt-1">{opts.hint}</p>}
    </div>
  );

  const select = (
    label: string,
    key: keyof PracticeFormData,
    options: { value: string; label: string }[],
    opts?: { wide?: boolean }
  ) => (
    <div className={opts?.wide ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      <select
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-background border-l border-border overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? "Edit Practice" : "New Practice"}
            </h2>
            {isEdit && <p className="text-xs text-muted-foreground mt-0.5">{initial.name}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-6">

          {/* Identity */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Practice Name", "name", { required: true, wide: true, placeholder: "Hallmark Dental" })}
              {!isEdit && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Slug <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    placeholder="hallmark-dental"
                    onChange={e => set("slug", e.target.value)}
                    onBlur={() => { if (!form.slug && form.name) set("slug", autoSlug(form.name)); }}
                    className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                  <p className="text-xs text-muted-foreground mt-1">URL-safe identifier, unique across all practices.</p>
                </div>
              )}
              {select("Vertical", "vertical", [
                { value: "dental", label: "Dental" },
                { value: "hair_salon", label: "Hair Salon" },
                { value: "car_dealership", label: "Car Dealership" },
                { value: "other", label: "Other" },
              ])}
              {isEdit && select("Status", "status", [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ])}
              {field("Brand Color", "primary_color", { placeholder: "E0622A", hint: "Hex without #. Used for buttons and badges." })}
            </div>
          </section>

          {/* Billing */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Billing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {select("Plan", "plan", [
                { value: "per_referral", label: "Per Referral" },
                { value: "monthly", label: "Monthly" },
              ])}
              {field("Monthly Fee ($)", "monthly_fee", { type: "number", placeholder: "0" })}
              {field("Per Referral Fee ($)", "per_referral_fee", { type: "number", placeholder: "20" })}
              {field("Patient Reward Value ($)", "reward_value", { type: "number", placeholder: "35", hint: "Default reward amount sent to the referring patient." })}
            </div>
          </section>

          {/* Tier Rewards */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Tier Rewards</h3>
            <p className="text-xs text-muted-foreground mb-4">Leave blank to use platform defaults (35 / 50 / 75 / 100)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {field("Influencer ($)", "tier_reward_starter",       { type: "number", placeholder: "35" })}
              {field("Amplifier ($)",  "tier_reward_rippler",       { type: "number", placeholder: "50" })}
              {field("Ambassador ($)", "tier_reward_super_rippler", { type: "number", placeholder: "75" })}
              {field("Legend ($)",     "tier_reward_legend",        { type: "number", placeholder: "100" })}
            </div>
          </section>

          {/* Integrations */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Twilio Phone Number", "twilio_phone_number", { placeholder: "+16158824095", hint: "Leave blank to use global env var." })}
              {field("SendGrid From Email", "sendgrid_from_email", { placeholder: "hello@example.com" })}
              {field("SendGrid From Name", "sendgrid_from_name", { placeholder: "Hallmark Dental", wide: true })}
              {field("Tango Template ID", "tango_email_template_id", { placeholder: "E813474", hint: "Tango Card email template ID for reward emails." })}
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Stripe billing — only shown when editing an existing practice */}
          {isEdit && <BillingPanel practice={initial as unknown as Practice & { id: string }} onBillingError={onBillingError} />}

          {/* Vagaro integration — only for salon practices */}
          {isEdit && form.vertical === "hair_salon" && <VagaroPanel practiceId={initial.id!} />}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border sticky bottom-0 bg-background flex items-center gap-3">
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={isPending || saved}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
              saved
                ? "bg-green-500/20 text-green-600 border border-green-500/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            )}
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved</>
            ) : isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : (
              isEdit ? "Save Changes" : "Create Practice"
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Practice row card ────────────────────────────────────────────────────────

function PracticeCard({ practice, onEdit }: { practice: Practice; onEdit: (p: Practice) => void }) {
  const accent = `#${practice.primary_color ?? "E0622A"}`;
  const isActive = practice.status !== "inactive";

  return (
    <div className="bg-card/30 border border-border rounded-2xl p-5 flex items-center gap-4 hover:bg-muted/10 transition-colors group">
      {/* Color swatch */}
      <div
        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{ backgroundColor: `${accent}20`, border: `1px solid ${accent}40` }}
      >
        <Building2 className="w-5 h-5" style={{ color: accent }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-foreground truncate">{practice.name}</p>
          <span className="text-xs text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded">
            {practice.slug}
          </span>
          {!isActive && (
            <span className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
              Inactive
            </span>
          )}
          <BillingBadge status={practice.billing_status} />
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="w-3 h-3" />
            {practice.vertical}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            ${practice.reward_value} reward · {practice.plan === "per_referral" ? `$${practice.per_referral_fee}/referral` : `$${(practice.monthly_fee / 100).toFixed(0)}/mo + $${practice.per_referral_fee}/ref`}
          </span>
          {practice.office_count !== undefined && (
            <span className="text-xs text-muted-foreground">
              {practice.office_count} {practice.office_count === 1 ? "office" : "offices"}
            </span>
          )}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={() => onEdit(practice)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all px-3 py-1.5 rounded-lg hover:bg-muted/40"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PracticeAdminPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Practice | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);

  const { data: practices, isLoading, isError } = useQuery<Practice[]>({
    queryKey: ["/api/practices"],
    queryFn: fetchPractices,
    enabled: !authLoading && profile?.role === "super_admin",
  });

  function toFormData(p: Practice): PracticeFormData & { id: string } {
    return {
      id: p.id,
      name:                    p.name,
      slug:                    p.slug,
      vertical:                p.vertical ?? "dental",
      plan:                    p.plan ?? "per_referral",
      monthly_fee:             String(p.monthly_fee ?? 0),
      per_referral_fee:        String(p.per_referral_fee ?? 20),
      reward_value:            String(p.reward_value ?? 35),
      twilio_phone_number:     p.twilio_phone_number ?? "",
      sendgrid_from_email:     p.sendgrid_from_email ?? "",
      sendgrid_from_name:      p.sendgrid_from_name ?? "",
      tango_email_template_id: p.tango_email_template_id ?? "",
      primary_color:           p.primary_color ?? "E0622A",
      status:                  p.status ?? "active",
      tier_reward_starter:       p.tier_reward_starter != null ? String(p.tier_reward_starter) : "",
      tier_reward_rippler:       p.tier_reward_rippler != null ? String(p.tier_reward_rippler) : "",
      tier_reward_super_rippler: p.tier_reward_super_rippler != null ? String(p.tier_reward_super_rippler) : "",
      tier_reward_legend:        p.tier_reward_legend != null ? String(p.tier_reward_legend) : "",
    };
  }

  if (profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">Super admin access required.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Billing error banner — survives drawer close */}
        {billingError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">Stripe billing error</p>
              <p className="text-xs text-destructive/80 font-mono mt-0.5 break-all">{billingError}</p>
            </div>
            <button onClick={() => setBillingError(null)} className="text-destructive/60 hover:text-destructive text-xs shrink-0">✕</button>
          </div>
        )}
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Practices</h1>
            <p className="text-muted-foreground mt-1">
              Manage all practices and their integration settings.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Practice
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-center gap-3 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">Failed to load practices. Please refresh.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && practices?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 gap-5 rounded-2xl border border-dashed border-border bg-muted/10">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-primary/40" />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-xl font-semibold text-foreground">No practices yet</p>
              <p className="text-muted-foreground text-sm mt-2">
                Create your first practice to start onboarding clients.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Practice
            </button>
          </div>
        )}

        {/* List */}
        {!isLoading && !isError && practices && practices.length > 0 && (
          <div className="space-y-3">
            {practices.map(p => (
              <PracticeCard key={p.id} practice={p} onEdit={setEditTarget} />
            ))}
            <p className="text-xs text-muted-foreground px-1 pt-1">
              {practices.length} practice{practices.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Create drawer */}
      {showCreate && (
        <PracticeForm
          initial={EMPTY_FORM}
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {/* Edit drawer */}
      {editTarget && (
        <PracticeForm
          initial={toFormData(editTarget)}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
          onBillingError={setBillingError}
        />
      )}
    </>
  );
}
