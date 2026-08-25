import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Loader2, AlertTriangle, Pencil, CheckCircle2, X,
  ChevronRight, Scissors, ExternalLink,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ────────────────────────────────────────────────────────────────────

interface CustomReward {
  id: string;
  label: string;
  description: string;
  value: number;
}

interface ClientPractice {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  status: string;
  white_label_name: string | null;
  white_label_logo_url: string | null;
  white_label_primary_color: string | null;
  show_powered_by_rippl: boolean;
  integration_config: Record<string, unknown> | null;
  reward_value: number;
  office_count?: number;
  created_at: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchClients(): Promise<ClientPractice[]> {
  return customFetch<ClientPractice[]>(`${BASE}/api/practices/my-clients`);
}

// ── Reward editor ─────────────────────────────────────────────────────────────

function RewardEditor({
  rewards,
  onChange,
}: {
  rewards: CustomReward[];
  onChange: (rewards: CustomReward[]) => void;
}) {
  const update = (idx: number, field: keyof CustomReward, val: string | number) => {
    const next = rewards.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange(next);
  };
  const remove = (idx: number) => onChange(rewards.filter((_, i) => i !== idx));
  const add = () =>
    onChange([
      ...rewards,
      { id: `reward_${Date.now()}`, label: "", description: "", value: 100 },
    ]);

  return (
    <div className="space-y-3">
      {rewards.map((r, idx) => (
        <div key={r.id} className="border border-border rounded-xl p-3 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
              placeholder="Label (e.g. Amazon Gift Card)"
              value={r.label}
              onChange={e => update(idx, "label", e.target.value)}
            />
            <input
              className="w-20 text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-right"
              type="number"
              placeholder="100"
              value={r.value}
              onChange={e => update(idx, "value", Number(e.target.value))}
            />
            <button
              onClick={() => remove(idx)}
              className="text-muted-foreground hover:text-destructive p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-muted-foreground"
            placeholder="Description shown to customer"
            value={r.description}
            onChange={e => update(idx, "description", e.target.value)}
          />
        </div>
      ))}
      <button
        onClick={add}
        className="text-sm text-primary hover:underline font-medium"
      >
        + Add reward option
      </button>
    </div>
  );
}

// ── Edit drawer ───────────────────────────────────────────────────────────────

interface EditDrawerProps {
  practice: ClientPractice;
  onClose: () => void;
}

function EditDrawer({ practice, onClose }: EditDrawerProps) {
  const qc = useQueryClient();
  const [wlName, setWlName] = useState(practice.white_label_name ?? "");
  const [wlColor, setWlColor] = useState(practice.white_label_primary_color ?? "0d9488");
  const [wlLogo, setWlLogo] = useState(practice.white_label_logo_url ?? "");
  const [showPowered, setShowPowered] = useState(practice.show_powered_by_rippl !== false);

  const existingRewards = Array.isArray(
    (practice.integration_config as Record<string, unknown> | null)?.custom_rewards
  )
    ? ((practice.integration_config as Record<string, unknown>).custom_rewards as CustomReward[])
    : [];
  const [rewards, setRewards] = useState<CustomReward[]>(existingRewards);

  const mut = useMutation({
    mutationFn: (updates: Record<string, unknown>) =>
      customFetch<ClientPractice>(`${BASE}/api/practices/${practice.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/practices/my-clients"] });
      onClose();
    },
  });

  function save() {
    const existingConfig = (practice.integration_config as Record<string, unknown>) ?? {};
    mut.mutate({
      white_label_name:          wlName || null,
      white_label_primary_color: wlColor || null,
      white_label_logo_url:      wlLogo || null,
      show_powered_by_rippl:     showPowered,
      integration_config: {
        ...existingConfig,
        custom_rewards: rewards,
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-background border-l border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Editing</p>
            <h2 className="text-lg font-display font-bold text-foreground">{practice.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* White-label branding */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Branding</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Program Name</label>
                <input
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background"
                  placeholder="e.g. Hollow Ground Rewards"
                  value={wlName}
                  onChange={e => setWlName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Shown on the rewards page header and SMS messages.</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Logo URL</label>
                <input
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background font-mono"
                  placeholder="https://..."
                  value={wlLogo}
                  onChange={e => setWlLogo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Brand Color (hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={`#${wlColor}`}
                    onChange={e => setWlColor(e.target.value.replace("#", ""))}
                    className="w-10 h-8 rounded border border-border cursor-pointer"
                  />
                  <input
                    className="flex-1 text-sm border border-border rounded-xl px-3 py-2 bg-background font-mono"
                    placeholder="0d9488"
                    value={wlColor}
                    onChange={e => setWlColor(e.target.value.replace("#", ""))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPowered}
                  onChange={e => setShowPowered(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Show "Powered by Rippl" footer</span>
              </label>
            </div>
          </section>

          {/* Custom rewards */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-1">Reward Options</h3>
            <p className="text-xs text-muted-foreground mb-3">
              What customers can choose when they claim a referral reward. Gift cards are fulfilled automatically via Tango; everything else appears as an admin task.
            </p>
            <RewardEditor rewards={rewards} onChange={setRewards} />
          </section>

          {/* Preview link */}
          <section className="bg-muted/40 rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Customer-facing reward page</p>
            <a
              href={`/claim?practice=${practice.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              joinrippl.com/claim?practice={practice.slug}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>

          {mut.isError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Failed to save. Please try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={mut.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Client card ───────────────────────────────────────────────────────────────

function ClientCard({
  practice,
  onEdit,
}: {
  practice: ClientPractice;
  onEdit: () => void;
}) {
  const rewardCount = Array.isArray(
    (practice.integration_config as Record<string, unknown> | null)?.custom_rewards
  )
    ? ((practice.integration_config as Record<string, unknown>).custom_rewards as CustomReward[]).length
    : 0;

  return (
    <div className="border border-border rounded-2xl bg-card p-5 flex items-center gap-4">
      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Scissors className="w-5 h-5 text-primary" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-foreground text-sm">{practice.name}</p>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full border font-medium",
            practice.status === "active"
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}>
            {practice.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {practice.white_label_name ? `"${practice.white_label_name}"` : "No brand name set"}
          {" · "}
          {rewardCount > 0 ? `${rewardCount} reward option${rewardCount !== 1 ? "s" : ""}` : "No rewards configured"}
        </p>
        {practice.office_count !== undefined && (
          <p className="text-xs text-muted-foreground">
            {practice.office_count} location{practice.office_count !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0"
      >
        <Pencil className="w-3.5 h-3.5" />
        Configure
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChannelPartnerClientsPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [editing, setEditing] = useState<ClientPractice | null>(null);

  const { data: clients, isLoading, isError } = useQuery<ClientPractice[]>({
    queryKey: ["/api/practices/my-clients"],
    queryFn: fetchClients,
    enabled: !authLoading && (profile?.role === "channel_partner" || profile?.role === "super_admin"),
  });

  if (profile?.role !== "channel_partner" && profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">Channel partner access required.</p>
      </div>
    );
  }

  return (
    <>
      {editing && <EditDrawer practice={editing} onClose={() => setEditing(null)} />}

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Client Salons</h1>
          <p className="text-muted-foreground mt-1">
            Manage branding and reward options for each of your salon clients.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading clients...</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-destructive text-sm py-8 justify-center">
            <AlertTriangle className="w-4 h-4" />
            Failed to load clients.
          </div>
        )}

        {!isLoading && !isError && clients?.length === 0 && (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No clients yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Clients will appear here once they're set up by your Rippl account manager.
            </p>
          </div>
        )}

        {!isLoading && clients && clients.length > 0 && (
          <div className="space-y-3">
            {clients.map(c => (
              <ClientCard key={c.id} practice={c} onEdit={() => setEditing(c)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
