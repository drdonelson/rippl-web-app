import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Upload, X, Loader2, ImageIcon, CheckCircle2,
  ToggleLeft, ToggleRight, Wifi, WifiOff, Users, DollarSign,
  Pencil, Plus, AlertTriangle,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { DEMO_OFFICES, DEMO_OFFICES_AUTO, DEMO_OFFICES_SALON } from "@/lib/demo-data";
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

interface OfficeConfig {
  id: string;
  name: string;
  location_code: string;
  customer_key: string | null;
  od_url: string | null;
  active: boolean;
  practice_id: string | null;
}

interface PracticeOption { id: string; name: string; }

// ── Office edit drawer ─────────────────────────────────────────────────────────

function OfficeEditDrawer({ officeId, onClose }: { officeId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<{ name: string; customer_key: string; od_url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: config } = useQuery<OfficeConfig>({
    queryKey: [`/api/offices/${officeId}/config`],
    queryFn: () => customFetch<OfficeConfig>(`${BASE}/api/offices/${officeId}/config`),
  });

  React.useEffect(() => {
    if (config && !form) {
      setForm({ name: config.name, customer_key: config.customer_key ?? "", od_url: config.od_url ?? "" });
    }
  }, [config, form]);

  const patchMut = useMutation({
    mutationFn: (body: object) =>
      customFetch(`${BASE}/api/offices/${officeId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/offices/managed"] });
      setSaved(true);
      setTimeout(onClose, 900);
    },
    onError: (err: Error) => setError(err.message),
  });

  const inp = "w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-background border-l border-border flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold text-foreground">Edit Office</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-5">
          {!form ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (<>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Office Name</label>
              <input value={form.name} onChange={e => setForm(f => f && { ...f, name: e.target.value })}
                className={inp.replace("font-mono", "")} placeholder="Brentwood" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">OD Customer Key</label>
              <input value={form.customer_key} onChange={e => setForm(f => f && { ...f, customer_key: e.target.value })}
                className={inp} placeholder="XXXXXXXXXXXXXXXX" />
              <p className="text-xs text-muted-foreground mt-1">16-character key from Open Dental eConnector. Leave blank for non-dental.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">OD Server URL</label>
              <input value={form.od_url} onChange={e => setForm(f => f && { ...f, od_url: e.target.value })}
                className={inp} placeholder="https://od.practice.com" />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
          </>)}
        </div>
        <div className="px-6 py-4 border-t border-border sticky bottom-0 bg-background flex gap-3">
          <button
            disabled={!form || patchMut.isPending || saved}
            onClick={() => form && patchMut.mutate({ name: form.name, customer_key: form.customer_key || null, od_url: form.od_url || null })}
            className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
              saved ? "bg-green-500/20 text-green-600 border border-green-500/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50")}
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : patchMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Changes"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Office create drawer ───────────────────────────────────────────────────────

function OfficeCreateDrawer({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ practice_id: "", name: "", location_code: "", customer_key: "", od_url: "" });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: practices = [] } = useQuery<PracticeOption[]>({
    queryKey: ["/api/practices"],
    queryFn: () => customFetch<PracticeOption[]>(`${BASE}/api/practices`),
  });

  const createMut = useMutation({
    mutationFn: () => customFetch(`${BASE}/api/offices`, { method: "POST", body: JSON.stringify({
      practice_id:  form.practice_id,
      name:         form.name,
      location_code: form.location_code,
      customer_key: form.customer_key || null,
      od_url:       form.od_url || null,
    }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/offices/managed"] });
      setSaved(true);
      setTimeout(onClose, 900);
    },
    onError: (err: Error) => setError(err.message),
  });

  function submit() {
    if (!form.practice_id) { setError("Select a practice"); return; }
    if (!form.name.trim()) { setError("Office name is required"); return; }
    if (!form.location_code.trim()) { setError("Location code is required"); return; }
    setError(null);
    createMut.mutate();
  }

  const inp = "w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-background border-l border-border flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-lg font-semibold text-foreground">New Office</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 px-6 py-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Practice <span className="text-destructive">*</span></label>
            <select value={form.practice_id} onChange={e => setForm(f => ({ ...f, practice_id: e.target.value }))}
              className={inp}>
              <option value="">Select a practice…</option>
              {practices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Office Name <span className="text-destructive">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} placeholder="Brentwood" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Location Code <span className="text-destructive">*</span></label>
            <input value={form.location_code}
              onChange={e => setForm(f => ({ ...f, location_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
              className={inp} placeholder="brentwood" />
            <p className="text-xs text-muted-foreground mt-1">Lowercase, no spaces. Sets staff role: staff_{"{"}location_code{"}"}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">OD Customer Key</label>
            <input value={form.customer_key} onChange={e => setForm(f => ({ ...f, customer_key: e.target.value }))}
              className={`${inp} font-mono text-xs tracking-widest`} placeholder="XXXXXXXXXXXXXXXX" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">OD Server URL</label>
            <input value={form.od_url} onChange={e => setForm(f => ({ ...f, od_url: e.target.value }))}
              className={`${inp} font-mono text-xs`} placeholder="https://od.practice.com" />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border sticky bottom-0 bg-background flex gap-3">
          <button
            disabled={createMut.isPending || saved}
            onClick={submit}
            className={cn("flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
              saved ? "bg-green-500/20 text-green-600 border border-green-500/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50")}
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Created</> : createMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Office"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
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
  const { profile, isDemo, demoVertical } = useAuth();
  const [tab, setTab] = useState<Tab>("locations");
  const [editingOfficeId, setEditingOfficeId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const demoOffices = demoVertical === "automotive" ? DEMO_OFFICES_AUTO : demoVertical === "salon" ? DEMO_OFFICES_SALON : DEMO_OFFICES;

  const { data: offices = [], isLoading, error } = useQuery<Office[]>({
    queryKey: ["/api/offices/managed", demoVertical],
    queryFn: isDemo
      ? () => Promise.resolve(demoOffices as Office[])
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
        ) : (<>
          {isSuperAdmin && (
            <div className="flex justify-end">
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Office
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offices.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border border-dashed border-border bg-muted/10">
                <Building2 className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No offices found.</p>
              </div>
            ) : (
              offices.map(office => (
                <div key={office.id} className="relative group">
                  {isSuperAdmin && (
                    <button
                      onClick={() => setEditingOfficeId(office.id)}
                      className="absolute top-4 right-4 z-10 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 opacity-0 group-hover:opacity-100 transition-all"
                      title="Edit office"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <OfficeLogoCard office={office} isSuperAdmin={isSuperAdmin} />
                </div>
              ))
            )}
          </div>
        </>)
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

      {editingOfficeId && (
        <OfficeEditDrawer officeId={editingOfficeId} onClose={() => setEditingOfficeId(null)} />
      )}
      {creating && (
        <OfficeCreateDrawer onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
