import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone, MessageSquare, Mail, Loader2, AlertTriangle,
  Users, CheckCircle2, Clock, Send, ChevronDown, Eye, RefreshCw,
  Hash, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { customFetch } from "@workspace/api-client-react";
import { Modal } from "@/components/ui/modal";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Types ─────────────────────────────────────────────────────────────────────

type Channel = "sms" | "email";

type AudienceFilter =
  | "not_contacted"
  | "active_referrers"
  | "tier_starter"
  | "tier_rippler"
  | "tier_super_rippler"
  | "tier_rippl_legend"
  | "office_brentwood"
  | "office_lewisburg"
  | "office_greenbrier"
  | "no_referrals_90d";

interface FilterOption { value: AudienceFilter; label: string; description: string }

const FILTER_OPTIONS: FilterOption[] = [
  { value: "not_contacted",       label: "Not yet contacted",            description: "Patients who haven't received a referral link yet" },
  { value: "active_referrers",    label: "Active referrers",            description: "Patients with at least one referral" },
  { value: "tier_starter",        label: "Tier: Influencer",            description: "Patients at the Influencer tier (0–2 referrals)" },
  { value: "tier_rippler",        label: "Tier: Amplifier",             description: "Patients at the Amplifier tier (3–5 referrals)" },
  { value: "tier_super_rippler",  label: "Tier: Ambassador",            description: "Patients at the Ambassador tier (6–9 referrals)" },
  { value: "tier_rippl_legend",   label: "Tier: Legend",                description: "Patients at the Legend tier (10+ referrals)" },
  { value: "office_brentwood",    label: "Office: Brentwood",           description: "Patients assigned to Hallmark Dental – Brentwood" },
  { value: "office_lewisburg",    label: "Office: Lewisburg",           description: "Patients assigned to Hallmark Dental – Lewisburg" },
  { value: "office_greenbrier",   label: "Office: Greenbrier",          description: "Patients assigned to Hallmark Dental – Greenbrier" },
  { value: "no_referrals_90d",    label: "No referrals in last 90 days", description: "Patients who haven't referred anyone in 90 days (re-engagement)" },
];

interface CountResult {
  count: number;
  preview_patient: {
    name: string;
    referral_code: string;
    tier: string | null;
    reward_value: number | null;
    office_name: string | null;
  } | null;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  audience_filter: string;
  message_template: string;
  sent_count: number;
  failed_count: number;
  status: string;
  created_by: string | null;
  sent_at: string | null;
  created_at: string;
}

const TIER_NAMES: Record<string, string> = {
  starter:       "Influencer",
  rippler:       "Amplifier",
  super_rippler: "Ambassador",
  rippl_legend:  "Legend",
};

const APP_URL = "https://www.joinrippl.com";

// ── Template helpers ──────────────────────────────────────────────────────────

const DYNAMIC_TAGS = [
  { tag: "{{first_name}}",    hint: "Patient's first name" },
  { tag: "{{referral_link}}", hint: "Their personal referral link" },
  { tag: "{{tier_name}}",     hint: "Their current tier (Influencer, etc.)" },
  { tag: "{{reward_value}}",  hint: "Their current reward value (e.g. $35)" },
  { tag: "{{office_name}}",   hint: "Their home office name" },
];

function renderPreview(
  template: string,
  patient: CountResult["preview_patient"] | null
): string {
  if (!patient) return template;
  const firstName   = patient.name?.split(" ")[0] ?? "Sarah";
  const tierName    = TIER_NAMES[patient.tier ?? "starter"] ?? "Influencer";
  const referralLink = `${APP_URL}/refer?code=${patient.referral_code}`;
  const rewardValue = `$${patient.reward_value ?? 35}`;
  const officeName  = patient.office_name ?? "Hallmark Dental";

  return template
    .replace(/\{\{first_name\}\}/g,    firstName)
    .replace(/\{\{referral_link\}\}/g, referralLink)
    .replace(/\{\{tier_name\}\}/g,     tierName)
    .replace(/\{\{reward_value\}\}/g,  rewardValue)
    .replace(/\{\{office_name\}\}/g,   officeName);
}

const DEFAULT_SMS = `Hi {{first_name}} 👋 You've been selected as a Rippl referrer at {{office_name}}! Share your personal link and earn rewards: {{referral_link}}`;
const DEFAULT_EMAIL = `Hi {{first_name}},

We're reaching out because you're a valued patient at {{office_name}}.

Did you know you can earn rewards by referring friends and family? As a {{tier_name}} member, your current reward value is {{reward_value}}.

Share your personal referral link: {{referral_link}}

Thank you for being part of our community!

— The Team at {{office_name}}`;

function estimatedDelivery(count: number, channel: Channel): string {
  if (count === 0) return "—";
  const secs = Math.ceil(count / 10) + 2;
  if (secs < 60) return `~${secs}s`;
  return `~${Math.ceil(secs / 60)}m`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function filterLabel(f: string) {
  return FILTER_OPTIONS.find(o => o.value === f)?.label ?? f;
}

// ── Campaign builder tab ───────────────────────────────────────────────────────

function CampaignBuilder({ channel }: { channel: Channel }) {
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [campaignName, setCampaignName]   = useState("");
  const [filter, setFilter]               = useState<AudienceFilter>("not_contacted");
  const [template, setTemplate]           = useState(channel === "sms" ? DEFAULT_SMS : DEFAULT_EMAIL);
  const [countResult, setCountResult]     = useState<CountResult | null>(null);
  const [countLoading, setCountLoading]   = useState(false);
  const [confirmOpen, setConfirmOpen]     = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charCount = template.length;
  const smsSegments = channel === "sms" ? Math.ceil(charCount / 160) : 0;

  // Fetch count whenever filter changes
  const fetchCount = useCallback(async (f: AudienceFilter) => {
    setCountLoading(true);
    try {
      const result = await customFetch<CountResult>(`${BASE}/api/campaigns/count`, {
        method: "POST",
        body: JSON.stringify({ filter: f }),
        headers: { "Content-Type": "application/json" },
      });
      setCountResult(result);
    } catch {
      setCountResult(null);
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCount(filter), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filter, fetchCount]);

  const sendMutation = useMutation({
    mutationFn: () => customFetch(`${BASE}/api/campaigns/send`, {
      method: "POST",
      body: JSON.stringify({
        name:             campaignName.trim() || `${channel.toUpperCase()} Campaign ${new Date().toLocaleDateString()}`,
        channel,
        filter,
        message_template: template,
      }),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => {
      toast.success("Campaign launched! Check history for status.");
      setConfirmOpen(false);
      setCampaignName("");
      setTemplate(channel === "sms" ? DEFAULT_SMS : DEFAULT_EMAIL);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send campaign");
      setConfirmOpen(false);
    },
  });

  function insertTag(tag: string) {
    const el = textareaRef.current;
    if (!el) {
      setTemplate(t => t + tag);
      return;
    }
    const start = el.selectionStart ?? template.length;
    const end   = el.selectionEnd   ?? template.length;
    const next  = template.slice(0, start) + tag + template.slice(end);
    setTemplate(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + tag.length;
      el.focus();
    }, 0);
  }

  const count      = countResult?.count ?? 0;
  const canSend    = count > 0 && template.trim().length > 0;
  const previewMsg = renderPreview(template, countResult?.preview_patient ?? null);

  return (
    <div className="space-y-6">
      {/* Builder card */}
      <div className="rounded-2xl border border-border bg-card/30 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          Campaign Builder
        </h2>

        {/* Campaign name */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Campaign Name
          </label>
          <input
            value={campaignName}
            onChange={e => setCampaignName(e.target.value)}
            placeholder={`${channel === "sms" ? "SMS" : "Email"} Campaign — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Audience filter */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Audience
          </label>
          <div className="relative">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as AudienceFilter)}
              className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            >
              {FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {FILTER_OPTIONS.find(o => o.value === filter)?.description}
          </p>
        </div>

        {/* Reach count */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
          countLoading
            ? "border-border bg-muted/10 text-muted-foreground"
            : count > 0
              ? "border-primary/30 bg-primary/5 text-foreground"
              : "border-border bg-muted/10 text-muted-foreground"
        )}>
          {countLoading
            ? <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            : <Users className="w-4 h-4 shrink-0 text-primary" />
          }
          <span className="text-sm font-medium">
            {countLoading
              ? "Counting patients…"
              : count === 0
                ? "No patients match this filter"
                : <>This campaign will reach <strong className="text-primary">{count}</strong> patient{count !== 1 ? "s" : ""}</>
            }
          </span>
        </div>

        {/* Message template */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Message Template
            </label>
            {channel === "sms" && (
              <span className={cn(
                "text-xs font-mono tabular-nums",
                charCount > 160 ? "text-amber-400" : "text-muted-foreground"
              )}>
                {charCount} chars · {smsSegments} segment{smsSegments !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Dynamic tag inserter */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DYNAMIC_TAGS.map(({ tag, hint }) => (
              <button
                key={tag}
                onClick={() => insertTag(tag)}
                title={hint}
                className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-mono hover:bg-primary/20 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={channel === "sms" ? 4 : 10}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-y font-mono"
            placeholder="Write your message here…"
          />

          {channel === "sms" && charCount > 160 && (
            <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Message exceeds 160 characters and will be sent as {smsSegments} SMS segments.
            </p>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={!canSend || countLoading}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-xl transition-all shadow-lg shadow-primary/20"
        >
          <Send className="w-4 h-4" />
          {channel === "sms" ? "Send SMS Campaign" : "Send Email Campaign"}
        </button>
      </div>

      {/* Preview panel */}
      {countResult && (
        <div className="rounded-2xl border border-border bg-card/30 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Preview
              {countResult.preview_patient && (
                <span className="text-muted-foreground font-normal ml-1.5">
                  — using data from {countResult.preview_patient.name.split(" ")[0]}
                </span>
              )}
            </h2>
          </div>
          {countResult.preview_patient ? (
            <div className="bg-background border border-border rounded-xl p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono">
                {previewMsg}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No patients match this filter — select a different audience to preview.</p>
          )}
        </div>
      )}

      {/* Confirm modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => { if (!sendMutation.isPending) setConfirmOpen(false); }}
        title="Confirm Campaign Send"
      >
        <div className="space-y-4 pt-1">
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Recipients</span>
              <span className="font-bold text-foreground">{count} patient{count !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Channel</span>
              <span className="font-semibold text-foreground capitalize">{channel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Audience</span>
              <span className="font-semibold text-foreground">{filterLabel(filter)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Est. delivery</span>
              <span className="font-semibold text-foreground">{estimatedDelivery(count, channel)}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            This will send {count} {channel === "sms" ? "text message" : "email"}{count !== 1 ? "s" : ""} immediately. This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={sendMutation.isPending}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {sendMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
              ) : (
                <><Zap className="w-4 h-4" />Send to {count} patient{count !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Campaign history ───────────────────────────────────────────────────────────

function CampaignHistory() {
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading, isError, refetch, isFetching } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn:  () => customFetch<Campaign[]>(`${BASE}/api/campaigns`),
    refetchInterval: 8000, // poll while 'draft' campaigns are being sent
  });

  function statusBadge(status: string) {
    if (status === "sent")    return "text-green-400 bg-green-500/10 border-green-500/20";
    if (status === "failed")  return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-amber-400 bg-amber-500/10 border-amber-500/20"; // draft / processing
  }

  function statusLabel(status: string) {
    if (status === "sent")   return "Sent";
    if (status === "failed") return "Failed";
    return "Sending…";
  }

  return (
    <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Campaign History
        </h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 flex items-center gap-1"
        >
          <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 m-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Failed to load campaign history.
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:grid grid-cols-[2fr_80px_1.5fr_80px_80px_100px] gap-4 px-6 py-2 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>Campaign</span>
            <span>Channel</span>
            <span>Audience</span>
            <span>Sent</span>
            <span>Failed</span>
            <span>Date</span>
          </div>
          <div className="divide-y divide-border">
            {campaigns.map(c => (
              <div
                key={c.id}
                className="grid md:grid-cols-[2fr_80px_1.5fr_80px_80px_100px] gap-4 px-6 py-4 text-sm items-center hover:bg-muted/10 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{c.name}</p>
                  <span className={cn(
                    "inline-flex items-center mt-0.5 px-2 py-0.5 rounded text-xs font-semibold border",
                    statusBadge(c.status)
                  )}>
                    {statusLabel(c.status)}
                  </span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {c.channel === "sms"
                      ? <MessageSquare className="w-3.5 h-3.5" />
                      : <Mail className="w-3.5 h-3.5" />}
                    {c.channel.toUpperCase()}
                  </span>
                </div>
                <div className="text-muted-foreground truncate text-xs">{filterLabel(c.audience_filter)}</div>
                <div className="font-semibold text-foreground">{c.sent_count}</div>
                <div className={cn("font-semibold", c.failed_count > 0 ? "text-red-400" : "text-muted-foreground")}>
                  {c.failed_count}
                </div>
                <div className="text-muted-foreground text-xs">{c.sent_at ? formatDate(c.sent_at) : formatDate(c.created_at)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [activeChannel, setActiveChannel] = useState<Channel>("sms");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Campaigns</h1>
        <p className="text-muted-foreground mt-1">
          Send targeted SMS or email campaigns to your patient referral network.
        </p>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1 p-1 bg-muted/20 border border-border rounded-xl w-fit">
        <button
          onClick={() => setActiveChannel("sms")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all",
            activeChannel === "sms"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          SMS Campaigns
        </button>
        <button
          onClick={() => setActiveChannel("email")}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all",
            activeChannel === "email"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Mail className="w-4 h-4" />
          Email Campaigns
        </button>
      </div>

      {/* Builder */}
      <CampaignBuilder key={activeChannel} channel={activeChannel} />

      {/* History */}
      <CampaignHistory />
    </div>
  );
}
