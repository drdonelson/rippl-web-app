import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Upload, X, Loader2, ImageIcon, CheckCircle2,
  ToggleLeft, ToggleRight, Wifi, WifiOff, Users, DollarSign,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { DEMO_OFFICES } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { StaffPanel } from "./staff";

interface Office {
  id: string;
  name: string;
  location_code: string;
  logo_url: string | null;
  active: boolean;
  last_poll_at: string | null;
}

interface PoolConfig {
  enabled: boolean;
  amount_per_referral: number;
}

interface PoolData {
  config: PoolConfig;
  balance: number;
  recent_entries: { id: string; amount: number; created_at: string }[];
}

function formatPollAge(last_poll_at: string | null): { label: string; ok: boolean } {
  if (!last_poll_at) return { label: "Never polled", ok: false };
  const ageMs = Date.now() - new Date(last_poll_at).getTime();
  const mins = Math.floor(ageMs / 60_000);
  if (mins < 1)  return { label: "Polled just now", ok: true };
  if (mins < 60) return { label: `Polled ${mins}m ago`, ok: true };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return { label: `Polled ${hrs}h ago`, ok: hrs < 12 };
  return { label: `Polled ${Math.floor(hrs / 24)}d ago`, ok: false };
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Office logo card ───────────────────────────────────────────────────────────

function OfficeLogoCard({ office, isSuperAdmin }: { office: Office; isSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(office.logo_url);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => customFetch(`${BASE}/api/offices/${office.id}/logo`, { method: "DELETE" }),
    onSuccess: () => {
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["/api/offices/managed"] });
    },
    onError: () => setError("Failed to remove logo"),
  });

  const toggleMutation = useMutation({
    mutationFn: (active: boolean) =>
      customFetch(`${BASE}/api/offices/${office.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/offices/managed"] }),
    onError: () => setError("Failed to update status"),
  });

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2MB."); return; }
    setError(null);
    setUploading(true);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await customFetch<{ logo_url: string }>(`${BASE}/api/offices/${office.id}/logo`, {
        method: "POST",
        body: JSON.stringify({ filename: file.name, mimeType: file.type, data: base64 }),
      });

      setPreview(result.logo_url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["/api/offices/managed"] });
    } catch (err: any) {
      setError(err?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-card/30 border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-primary/60" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{office.name}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{office.location_code}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {(() => {
            const poll = formatPollAge(office.last_poll_at);
            return (
              <span className={cn(
                "flex items-center gap-1 text-xs font-medium",
                poll.ok ? "text-[#E0622A]" : "text-amber-500",
              )}>
                {poll.ok ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {poll.label}
              </span>
            );
          })()}
          {isSuperAdmin && (
            <button
              onClick={() => toggleMutation.mutate(!office.active)}
              disabled={toggleMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {toggleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : office.active ? (
                <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-primary">Active</span></>
              ) : (
                <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground">Inactive</span></>
              )}
            </button>
          )}
          {!isSuperAdmin && !office.active && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground mb-3">Practice Logo</p>
        <p className="text-xs text-muted-foreground mb-4">
          This logo appears on the patient reward claim page instead of the default Rippl logo.
          PNG or JPG, under 2MB.
        </p>

        {preview ? (
          <div className="relative group inline-block">
            <img
              src={preview}
              alt="Practice logo"
              className="h-16 max-w-[200px] object-contain rounded-xl border border-border bg-white p-2"
            />
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            >
              {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/20 cursor-pointer transition-colors"
          >
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Click to upload logo</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
              uploading
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> {preview ? "Replace Logo" : "Upload Logo"}</>}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}

// ── Staff incentive pool config widget ────────────────────────────────────────

function PoolConfigCard({ practiceId }: { practiceId: string | null }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<{ enabled: boolean; amount: number } | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery<PoolData>({
    queryKey: ["/api/practice/pool"],
    queryFn: () => customFetch<PoolData>(`${BASE}/api/practice/pool`),
    enabled: !!practiceId,
  });

  const mutation = useMutation({
    mutationFn: (body: { enabled: boolean; amount_per_referral: number }) =>
      customFetch(`${BASE}/api/practice/pool`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/practice/pool"] });
      setDraft(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (!practiceId) return null;
  if (isLoading) return (
    <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading pool config…
    </div>
  );

  const cfg    = data?.config ?? { enabled: false, amount_per_referral: 10 };
  const active = draft ?? { enabled: cfg.enabled, amount: cfg.amount_per_referral };
  const isDirty = draft !== null;

  return (
    <div className="bg-card/30 border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary/60" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">Staff Incentive Pool</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rippl tracks a running pool balance for your team — you decide how to distribute it.
          </p>
        </div>
        {data && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-primary" style={{ fontFamily: "Georgia, serif" }}>
              ${data.balance}
            </p>
            <p className="text-xs text-muted-foreground">current balance</p>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-5 space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Enable staff pool</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each completed referral adds to the pool balance automatically.
            </p>
          </div>
          <button
            onClick={() => setDraft(d => ({ enabled: !(d ?? active).enabled, amount: (d ?? active).amount }))}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            {active.enabled
              ? <><ToggleRight className="w-7 h-7 text-primary" /><span className="text-primary">On</span></>
              : <><ToggleLeft className="w-7 h-7 text-muted-foreground" /><span className="text-muted-foreground">Off</span></>}
          </button>
        </div>

        {/* Amount input — only shown when enabled */}
        {active.enabled && (
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={active.amount}
                onChange={e => setDraft(d => ({ enabled: (d ?? active).enabled, amount: parseInt(e.target.value, 10) || 10 }))}
                className="w-20 bg-white border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <span className="text-sm text-muted-foreground">per completed referral</span>
            </div>
          </div>
        )}

        {/* Save / saved */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              onClick={() => mutation.mutate({ enabled: active.enabled, amount_per_referral: active.amount })}
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save"}
            </button>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-primary font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>

        {/* Recent entries */}
        {data && data.recent_entries.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent contributions</p>
            <div className="space-y-2">
              {data.recent_entries.slice(0, 5).map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">
                    {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span className="font-semibold text-foreground">+${entry.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "locations" | "team";

export default function OfficesPage() {
  const { profile, isDemo } = useAuth();
  const [tab, setTab] = useState<Tab>("locations");

  const { data: offices = [], isLoading, error } = useQuery<Office[]>({
    queryKey: ["/api/offices/managed"],
    queryFn: isDemo
      ? () => Promise.resolve(DEMO_OFFICES as Office[])
      : () => customFetch<Office[]>(`${BASE}/api/offices/managed`),
  });

  const isPracticeAdmin = isDemo || profile?.role === "practice_admin";
  const isSuperAdmin    = profile?.role === "super_admin";

  const tabClass = (t: Tab) => cn(
    "px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
    tab === t
      ? "bg-primary/10 text-primary border border-primary/20"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Offices & Team</h1>
        <p className="text-muted-foreground mt-1">
          {isPracticeAdmin
            ? "Manage your office settings, staff accounts, and staff incentive pool."
            : "Manage offices, staff, and incentive pool settings."}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl w-fit border border-border">
        <button className={tabClass("locations")} onClick={() => setTab("locations")}>
          <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Locations</span>
        </button>
        <button className={tabClass("team")} onClick={() => setTab("team")}>
          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Team</span>
        </button>
      </div>

      {/* Locations tab */}
      {tab === "locations" && (
        isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">Failed to load offices.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offices.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border border-dashed border-border bg-muted/10">
                <Building2 className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No offices found.</p>
              </div>
            ) : (
              offices.map(office => (
                <OfficeLogoCard key={office.id} office={office} isSuperAdmin={isSuperAdmin} />
              ))
            )}
          </div>
        )
      )}

      {/* Team tab */}
      {tab === "team" && (
        <div className="space-y-8">
          {isPracticeAdmin && (
            <PoolConfigCard practiceId={profile?.practice_id ?? null} />
          )}
          <StaffPanel />
        </div>
      )}
    </div>
  );
}
