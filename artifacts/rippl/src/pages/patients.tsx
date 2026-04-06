import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useGetReferrers, useCreateReferrer, useGetReferrerQr, getGetReferrerQrQueryKey, customFetch, ApiError } from "@workspace/api-client-react";
import { DEMO_REFERRERS } from "@/lib/demo-data";
import {
  Plus, QrCode, Search, Copy, Check, Download, RefreshCw,
  CheckCircle2, AlertTriangle, LayoutList, LayoutGrid,
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Star, MapPin, Lock,
  Send, Loader2, Phone, Mail, Users, BellOff, X, Info,
} from "lucide-react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useOffice, type Office } from "@/contexts/office-context";
import { useAuth } from "@/contexts/auth-context";
import { getPublicAppUrl, buildReferralUrl } from "@/lib/app-url";
import { getTierConfig, getTierTooltip } from "@/lib/tier-config";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  patient_id: z.string().min(1, "Patient ID is required"),
  phone: z.string().min(10, "Valid phone is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal('')),
  office_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ImportPhase =
  | { state: "idle" }
  | { state: "importing"; current: number }
  | { state: "done"; imported: number; skipped: number }
  | { state: "error"; message: string; partialImported: number };

type ViewMode = "list" | "grid";
type SortField = "name" | "total_referrals" | "total_rewards_issued";
type SortDir = "asc" | "desc";
type ContactFilter = "all" | "not_contacted" | "contacted" | "active";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return (phone.replace(/\D/g, "").length >= 7);
}

function StatusDot({ n, onboarded }: { n: number; onboarded: boolean }) {
  if (n >= 1) return (
    <Star
      className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0"
      title="Active referrer — has sent referrals"
    />
  );
  if (onboarded) return (
    <span
      className="w-2 h-2 rounded-full bg-primary shrink-0 inline-block"
      title="Contacted — referral link sent"
    />
  );
  return (
    <span
      className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0 inline-block"
      title="Not yet contacted"
    />
  );
}

// ── Chunked import API helpers ────────────────────────────────────────────
interface ChunkResult {
  imported:      number;
  skipped:       number;
  next_offset:   number;
  total_fetched: number;
  done:          boolean;
}

async function importChunk(officeId: string | null, offset: number): Promise<ChunkResult> {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 25_000);
  try {
    const result = await customFetch<ChunkResult>(
      `${BASE}/api/import/patients/chunk`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ office_id: officeId, offset, limit: 100 }),
        signal:  controller.signal,
      }
    );
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchChunkWithRetry(officeId: string | null, offset: number): Promise<ChunkResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await importChunk(officeId, offset);
    } catch (err) {
      if (attempt === 1) throw err;
      await new Promise<void>(r => setTimeout(r, 2_000));
    }
  }
  // unreachable — TypeScript requires a return
  throw new Error("Import failed after 2 attempts");
}

interface OfficeImportRowProps {
  officeKey: string;
  officeName: string;
  officeId: string | null;
  active: boolean;
  phase: ImportPhase;
  onImport: () => void;
  onReset: () => void;
}

function OfficeImportRow({ officeName, active, phase, onImport, onReset }: OfficeImportRowProps) {
  const isWorking = phase.state === "importing";
  const _dash = officeName.lastIndexOf("–");
  const displayName = _dash !== -1 ? officeName.slice(_dash + 2).trim() : officeName;

  if (!active) {
    return (
      <div className="py-3 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
            <span className="text-sm font-medium text-muted-foreground/60 truncate">{displayName}</span>
          </div>
          <div className="relative group flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 text-muted-foreground/50 text-xs font-semibold cursor-default select-none">
              <Lock className="w-3 h-3" />
              Locked
            </div>
            <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-popover border border-border rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-lg">
              Add Customer Key in settings to activate this location
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {phase.state === "importing" && (
            <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
              {phase.current > 0
                ? `Importing… ${phase.current.toLocaleString()} patients added so far`
                : "Importing…"}
            </span>
          )}
          {phase.state === "done" && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {phase.imported} new, {phase.skipped} skipped
            </span>
          )}
          {phase.state === "error" && (
            <button
              onClick={onImport}
              className="flex items-center gap-1 text-xs text-destructive max-w-[240px] hover:text-destructive/80 transition-colors text-left"
              title={phase.message}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {phase.partialImported > 0
                  ? `Imported ${phase.partialImported.toLocaleString()} patients before error — tap to resume`
                  : phase.message}
              </span>
            </button>
          )}
          {(phase.state === "done" || phase.state === "error") && (
            <button onClick={onReset} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Reset">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onImport}
            disabled={isWorking}
            className="px-3 py-1.5 bg-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isWorking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {isWorking ? "Importing…" : "Import"}
          </button>
        </div>
      </div>

      {phase.state === "importing" && (
        <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full w-full bg-primary/60 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3.5 h-3.5 text-primary" />
    : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
}

function TierBadge({ tier, totalReferrals }: { tier: string | null | undefined; totalReferrals: number }) {
  const config = getTierConfig(tier);
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg} ${config.color} ${config.border}`}
      title={getTierTooltip(tier, totalReferrals)}
    >
      <img src={config.icon} alt={config.label} className="w-3.5 h-3.5 inline-block" /> {config.label}
    </span>
  );
}

function TierProgress({ tier, totalReferrals }: { tier: string | null | undefined; totalReferrals: number }) {
  const config = getTierConfig(tier);
  if (!config.nextTierAt) return null;
  const pct = Math.min(((totalReferrals - config.minReferrals) / (config.nextTierAt - config.minReferrals)) * 100, 100);
  return (
    <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-1.5" title={getTierTooltip(tier, totalReferrals)}>
      <div className={`h-full rounded-full transition-all ${config.progressBg}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SmsToggle({
  optedOut,
  loading,
  onClick,
}: {
  optedOut: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={optedOut ? "Re-enable automated messages" : "Exclude from automated messages"}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
        optedOut ? "bg-muted-foreground/25" : "bg-emerald-500",
        loading && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          optedOut ? "translate-x-0" : "translate-x-4",
        )}
      />
    </button>
  );
}

function SmsStatusCell({
  onboarded,
  optedOut,
  referrerId,
  referrerName,
  loading,
  showConfirm,
  onToggleClick,
  onConfirm,
  onCancel,
}: {
  onboarded: boolean;
  optedOut: boolean;
  referrerId: string;
  referrerName: string;
  loading: boolean;
  showConfirm: boolean;
  onToggleClick: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const firstName = referrerName.split(" ")[0] ?? referrerName;

  if (onboarded) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
        <Check className="w-2.5 h-2.5" /> Sent
      </span>
    );
  }

  if (!optedOut) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            <Check className="w-2.5 h-2.5" /> Scheduled
          </span>
          <SmsToggle optedOut={false} loading={loading} onClick={onToggleClick} />
        </div>
        {showConfirm && (
          <div className="rounded-lg border border-border bg-popover shadow-xl p-2.5 text-left" style={{ minWidth: "168px" }}>
            <p className="text-xs font-medium text-foreground mb-2">Exclude {firstName} from referral SMS?</p>
            <div className="flex gap-1.5">
              <button onClick={onCancel} className="flex-1 py-1.5 text-[11px] bg-muted hover:bg-muted/80 text-foreground rounded-md font-medium transition-colors">Cancel</button>
              <button onClick={onConfirm} disabled={loading} className="flex-1 py-1.5 text-[11px] bg-destructive hover:bg-destructive/90 text-white rounded-md font-semibold transition-colors disabled:opacity-50">Exclude</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap">
          <X className="w-2.5 h-2.5" /> No SMS
        </span>
        <SmsToggle optedOut={true} loading={loading} onClick={onToggleClick} />
      </div>
      {showConfirm && (
        <div className="rounded-lg border border-border bg-popover shadow-xl p-2.5 text-left" style={{ minWidth: "168px" }}>
          <p className="text-xs font-medium text-foreground mb-2">Re-enable SMS for {firstName}?</p>
          <div className="flex gap-1.5">
            <button onClick={onCancel} className="flex-1 py-1.5 text-[11px] bg-muted hover:bg-muted/80 text-foreground rounded-md font-medium transition-colors">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 py-1.5 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-semibold transition-colors disabled:opacity-50">Enable</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Patients() {
  const { isDemo, isLoading: authIsLoading, isStaff, profile } = useAuth();

  // Gate queries until auth is fully resolved — prevents API calls from firing
  // before profile loads (when isDemo is still false at first render).
  const queryEnabled = !authIsLoading && !isDemo;

  const { data: fetchedReferrers, isLoading: referrersLoading } = useGetReferrers({ query: { enabled: queryEnabled } });
  const referrers = isDemo ? DEMO_REFERRERS : fetchedReferrers;
  const isLoading = isDemo ? false : referrersLoading;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // View toggle — persisted in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem("rippl_patients_view") as ViewMode) || "list"; }
    catch { return "list"; }
  });

  const setView = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem("rippl_patients_view", mode); } catch {}
  };

  // Sort state (list view only)
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Contact status filter
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");

  // Mobile Safari: cap visible rows to avoid OOM on large lists.
  // Users can expand with "Show all" if needed.
  const MOBILE_ROW_LIMIT = 50;
  const [showAllMobile, setShowAllMobile] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  // Office context
  const { offices, selectedOfficeId } = useOffice();

  // Determine which single office patients will be tagged to during import.
  // • Specific office selected → use that office.
  // • "All Locations" selected → default to Brentwood; fall back to first active office.
  const importTargetOffice = useMemo((): Office | null => {
    if (!offices.length) return null;
    if (selectedOfficeId !== "all") {
      return offices.find(o => o.id === selectedOfficeId) ?? null;
    }
    return (
      offices.find(o => o.active && o.name.toLowerCase().includes("brentwood")) ??
      offices.find(o => o.active) ??
      offices[0] ??
      null
    );
  }, [offices, selectedOfficeId]);

  // Per-office import state: officeId (or "default") → ImportPhase
  const [importPhases, setImportPhases] = useState<Map<string, ImportPhase>>(new Map());
  // cancelRefs: set { cancelled: true } to abort an in-flight import loop
  const cancelRefs = useRef<Map<string, { cancelled: boolean }>>(new Map());

  const getImportPhase = (key: string): ImportPhase =>
    importPhases.get(key) ?? { state: "idle" };

  const setOfficeImportPhase = (key: string, phase: ImportPhase | ((prev: ImportPhase) => ImportPhase)) => {
    setImportPhases(prev => {
      const next = new Map(prev);
      const current = next.get(key) ?? { state: "idle" };
      next.set(key, typeof phase === "function" ? phase(current) : phase);
      return next;
    });
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qrModalReferrerId, setQrModalReferrerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Send Referral Link modal
  const [sendLinkModalReferrerId, setSendLinkModalReferrerId] = useState<string | null>(null);
  const [sendChannelSms, setSendChannelSms] = useState(true);
  const [sendChannelEmail, setSendChannelEmail] = useState(false);
  const [sendCustomMessage, setSendCustomMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<null | {
    sms?: { status: string; reason?: string };
    email?: { status: string; reason?: string };
  }>(null);

  // Bulk send state
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [bulkChannelSms, setBulkChannelSms] = useState(true);
  const [bulkChannelEmail, setBulkChannelEmail] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<null | {
    total: number; sent: number; failed: number; skipped: number; errors: string[];
  }>(null);

  // Opt-out toggle
  const [optOutLoadingIds, setOptOutLoadingIds] = useState<Set<string>>(new Set());
  const [confirmPopover, setConfirmPopover] = useState<{ id: string; name: string; optedOut: boolean } | null>(null);

  const handleToggleOptOut = async (referrerId: string, name: string, currentlyOptedOut: boolean) => {
    if (optOutLoadingIds.has(referrerId)) return;
    const newOptOut = !currentlyOptedOut;
    const firstName = name.split(" ")[0];

    setOptOutLoadingIds(prev => new Set(prev).add(referrerId));

    if (isDemo) {
      await new Promise(r => setTimeout(r, 500));
      toast.success(
        newOptOut
          ? `Demo: ${firstName} excluded from automated messages.`
          : `Demo: ${firstName} re-enabled for automated messages.`
      );
      setOptOutLoadingIds(prev => { const s = new Set(prev); s.delete(referrerId); return s; });
      return;
    }

    try {
      await customFetch(`${BASE}/api/referrers/${referrerId}/opt-out`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms_opt_out: newOptOut }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
      toast.success(
        newOptOut
          ? `${firstName} excluded from automated messages.`
          : `${firstName} will receive automated messages again.`
      );
    } catch {
      toast.error("Failed to update — please try again.");
    } finally {
      setOptOutLoadingIds(prev => { const s = new Set(prev); s.delete(referrerId); return s; });
    }
  };

  const handleConfirmOptOut = async () => {
    if (!confirmPopover) return;
    const { id, name, optedOut } = confirmPopover;
    setConfirmPopover(null);
    await handleToggleOptOut(id, name, optedOut);
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema)
  });

  const openAddModal = () => {
    // Staff are always locked to their assigned office.
    // All other roles default to the currently-selected (or Brentwood) office.
    const defaultOfficeId = isStaff && profile?.practice_id
      ? profile.practice_id
      : importTargetOffice?.id ?? "";
    reset({
      name: "",
      patient_id: "",
      phone: "",
      email: "",
      office_id: defaultOfficeId,
    });
    setIsAddModalOpen(true);
  };

  const createReferrer = useCreateReferrer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        setIsAddModalOpen(false);
        reset();
      }
    }
  });

  const onSubmit = (data: FormValues) => createReferrer.mutate({ data });

  const { data: qrData } = useGetReferrerQr(qrModalReferrerId || "", {
    query: { queryKey: getGetReferrerQrQueryKey(qrModalReferrerId || ""), enabled: !!qrModalReferrerId && !isDemo }
  });

  // Full referral URL — only recomputed when the modal selection or fetched data changes
  const effectiveQrUrl = useMemo(() => {
    if (isDemo) {
      if (!qrModalReferrerId) return null;
      const dr = DEMO_REFERRERS.find(r => r.id === qrModalReferrerId);
      return dr ? buildReferralUrl(dr.referral_code, BASE) : null;
    }
    return qrData?.referral_url ?? null;
  }, [isDemo, qrModalReferrerId, qrData?.referral_url]);

  // Send-link modal — referrer lookup from already-loaded list (no extra query)
  const sendLinkReferrer = useMemo(() => {
    if (!sendLinkModalReferrerId) return null;
    const list = (isDemo ? DEMO_REFERRERS : (fetchedReferrers ?? [])) as Array<Record<string, unknown>>;
    return list.find(r => r.id === sendLinkModalReferrerId) ?? null;
  }, [sendLinkModalReferrerId, isDemo, fetchedReferrers]);

  const sendLinkUrl = useMemo(() => {
    if (!sendLinkReferrer) return null;
    const code = sendLinkReferrer.referral_code as string | null;
    if (!code) return null;
    return buildReferralUrl(code, BASE);
  }, [sendLinkReferrer]);

  // Count patients who have not yet received a referral link (live from loaded list)
  const unsentCount = useMemo(() => {
    if (!referrers) return 0;
    return (referrers as Array<Record<string, unknown>>).filter(r => !r.onboarding_sms_sent).length;
  }, [referrers]);

  const handleBulkSend = async () => {
    if (!bulkChannelSms && !bulkChannelEmail) {
      toast.error("Select at least one channel.");
      return;
    }
    const channels: string[] = [];
    if (bulkChannelSms)   channels.push("sms");
    if (bulkChannelEmail) channels.push("email");

    setBulkSending(true);
    try {
      const result = await customFetch<{
        total: number; sent: number; failed: number; skipped: number; errors: string[];
      }>(
        `${BASE}/api/referrers/bulk-send-links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            office_id: selectedOfficeId === "all" ? "all" : selectedOfficeId,
            channels,
          }),
        }
      );
      setBulkResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
      toast.success(
        `Sent to ${result.sent} patient${result.sent !== 1 ? "s" : ""}` +
        (result.failed > 0 ? ` (${result.failed} failed)` : "")
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk send failed";
      toast.error(msg);
    } finally {
      setBulkSending(false);
    }
  };

  const openSendLinkModal = (referrerId: string) => {
    setSendLinkModalReferrerId(referrerId);
    setSendChannelSms(true);
    setSendChannelEmail(false);
    setSendCustomMessage("");
    setSendResult(null);
  };

  const handleSendLink = async () => {
    if (!sendLinkModalReferrerId) return;
    const channels: string[] = [];
    if (sendChannelSms) channels.push("sms");
    if (sendChannelEmail) channels.push("email");
    if (!channels.length) { toast.error("Select at least one channel."); return; }
    setSendLoading(true);
    setSendResult(null);

    // ── Demo mode: simulate a send without any real SMS/email ─────────────────
    if (isDemo) {
      await new Promise(r => setTimeout(r, 900)); // simulate network delay
      const simulatedResult: { sms?: { status: string }; email?: { status: string } } = {};
      if (sendChannelSms) simulatedResult.sms = { status: "sent" };
      if (sendChannelEmail) simulatedResult.email = { status: "sent" };
      setSendResult(simulatedResult);
      const name = (sendLinkReferrer?.name as string)?.split(" ")[0] ?? "patient";
      const delivered = [sendChannelSms && "SMS", sendChannelEmail && "email"].filter(Boolean).join(" & ");
      toast.success(`Demo: referral link sent to ${name} via ${delivered}.`);
      setSendLoading(false);
      return;
    }

    try {
      // customFetch returns the parsed JSON body directly and throws ApiError for
      // non-2xx responses — reaching here always means HTTP 200.
      const data = await customFetch<{
        success?: boolean;
        sms?: { status: string; reason?: string };
        email?: { status: string; reason?: string };
      }>(`/api/referrers/${sendLinkModalReferrerId}/send-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels, customMessage: sendCustomMessage.trim() || undefined }),
      });
      setSendResult(data);
      toast.success("Referral link sent successfully!");
      // Refetch referrer list so the status dot updates without a manual refresh
      queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
    } catch (err) {
      if (err instanceof ApiError) {
        const serverMsg = (err.data as { error?: string } | null)?.error;
        toast.error(serverMsg ?? err.message);
      } else {
        toast.error("Network error. Check your connection and try again.");
      }
    } finally {
      setSendLoading(false);
    }
  };

  // (auth state logged removed — was causing extra effect tracking on mobile)

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // QR canvas — only fires when the URL changes (once per modal open)
  useEffect(() => {
    if (!effectiveQrUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, effectiveQrUrl, {
      width: 256, margin: 2,
      color: { dark: '#0a1628', light: '#ffffff' }
    });
  }, [effectiveQrUrl]);

  const copyLink = () => {
    if (effectiveQrUrl) {
      navigator.clipboard.writeText(effectiveQrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImportOffice = useCallback(async (officeKey: string, officeId: string | null) => {
    const phase = getImportPhase(officeKey);
    if (phase.state === "importing") return;

    // Register a cancellation flag so resetOfficeImport can stop the loop
    const cancelRef = { cancelled: false };
    cancelRefs.current.set(officeKey, cancelRef);

    setOfficeImportPhase(officeKey, { state: "importing", current: 0 });

    let offset      = 0;
    let accImported = 0;
    let accSkipped  = 0;

    try {
      while (!cancelRef.cancelled) {
        const result = await fetchChunkWithRetry(officeId, offset);

        if (cancelRef.cancelled) break;

        accImported += result.imported;
        accSkipped  += result.skipped;
        offset       = result.next_offset;

        // Update progress counter after every chunk
        setOfficeImportPhase(officeKey, { state: "importing", current: accImported });

        if (result.done) {
          setOfficeImportPhase(officeKey, {
            state:    "done",
            imported: accImported,
            skipped:  accSkipped,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          toast.success(`Import complete — ${accImported.toLocaleString()} patients added`, {
            description: accSkipped > 0
              ? `${accSkipped.toLocaleString()} already existed and were skipped.`
              : "All patients are new enrollees.",
            duration: 6000,
          });
          break;
        }
      }
    } catch (err) {
      if (cancelRef.cancelled) return;
      const message = err instanceof Error ? err.message : String(err);
      setOfficeImportPhase(officeKey, { state: "error", message, partialImported: accImported });
      toast.error("Import failed", { description: message, duration: 8000 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const resetOfficeImport = (key: string) => {
    const ref = cancelRefs.current.get(key);
    if (ref) { ref.cancelled = true; cancelRefs.current.delete(key); }
    setOfficeImportPhase(key, { state: "idle" });
  };

  // Filter
  const filteredReferrers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (referrers ?? []).filter(r => {
      // Office filter — only show patients from the selected office
      if (selectedOfficeId !== "all") {
        const rOfficeId = (r as unknown as Record<string, unknown>).office_id as string | null;
        if (rOfficeId !== selectedOfficeId) return false;
      }

      // Contact status filter
      const onboarded    = !!((r as unknown as Record<string, unknown>).onboarding_sms_sent);
      const hasReferrals = r.total_referrals > 0;
      if (contactFilter === "not_contacted" && onboarded)   return false;
      if (contactFilter === "contacted"     && !onboarded)  return false;
      if (contactFilter === "active"        && !hasReferrals) return false;

      return (
        r.name.toLowerCase().includes(term) ||
        (r.email && r.email.toLowerCase().includes(term)) ||
        (r.referral_code && r.referral_code.toLowerCase().includes(term)) ||
        r.patient_id.toLowerCase().includes(term)
      );
    });
  }, [referrers, searchTerm, selectedOfficeId, contactFilter]);

  // Sort (list view)
  const sortedReferrers = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredReferrers].sort((a, b) => {
      switch (sortField) {
        case "name": return dir * a.name.localeCompare(b.name);
        case "total_referrals": return dir * (a.total_referrals - b.total_referrals);
        case "total_rewards_issued": return dir * (a.total_rewards_issued - b.total_rewards_issued);
        default: return 0;
      }
    });
  }, [filteredReferrers, sortField, sortDir]);

  // Mobile: cap rows to MOBILE_ROW_LIMIT to prevent Safari OOM on large lists.
  // The full sortedReferrers is still used on desktop (sm+) table view.
  const mobileSortedReferrers = useMemo(
    () => showAllMobile ? sortedReferrers : sortedReferrers.slice(0, MOBILE_ROW_LIMIT),
    [sortedReferrers, showAllMobile],
  );

  const thSortBtn = (field: SortField, label: string, extraClass = "") => (
    <th className={cn("px-4 py-3 font-semibold text-left", extraClass)}>
      <button
        onClick={() => handleSort(field)}
        className={cn(
          "flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold transition-colors whitespace-nowrap",
          sortField === field ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </button>
    </th>
  );
  const thStatic = (label: string, extraClass = "") => (
    <th className={cn("px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap", extraClass)}>
      {label}
    </th>
  );

  // Render guard — all hooks above this line; early return is safe here
  if (authIsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm tracking-wide">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Patients & QR</h1>
          <p className="text-muted-foreground mt-2">Manage your referrers and generate custom QR codes.</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search — fills available space on mobile */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-64 text-sm transition-all"
            />
          </div>

          {/* View toggle — compact segmented control */}
          <div
            className="flex items-center flex-shrink-0 p-0.5 bg-muted border border-border rounded-lg"
            style={{ height: "36px" }}
          >
            <button
              onClick={() => setView("list")}
              title="List view"
              className={cn(
                "flex items-center justify-center w-8 h-full rounded-[5px] transition-all duration-150",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("grid")}
              title="Grid view"
              className={cn(
                "flex items-center justify-center w-8 h-full rounded-[5px] transition-all duration-150",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Patient — primary action, kept prominent */}
          <button
            onClick={openAddModal}
            className="flex-shrink-0 px-4 sm:px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
        </div>
      </div>

      {/* ── Import from Open Dental — hidden for demo users ─────────── */}
      {!isDemo && !authIsLoading && <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
              <Download className="w-3.5 h-3.5 text-primary/70" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">Import from Open Dental</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pull active patients and enroll them as referrers. Existing patients are skipped automatically.
              </p>
            </div>
          </div>

          {/* ── Target office badge — visible before import starts ── */}
          {importTargetOffice && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0 self-start">
              <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="text-xs text-primary font-medium whitespace-nowrap">
                {(() => {
                  const d = importTargetOffice.name.lastIndexOf("–");
                  return d !== -1
                    ? importTargetOffice.name.slice(d + 2).trim()
                    : importTargetOffice.name;
                })()}
                {selectedOfficeId === "all" && (
                  <span className="text-primary/60 font-normal"> (default)</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {!importTargetOffice ? (
            /* Fallback: offices not loaded yet */
            <OfficeImportRow
              officeKey="default"
              officeName="Open Dental"
              officeId={null}
              active={true}
              phase={getImportPhase("default")}
              onImport={() => handleImportOffice("default", null)}
              onReset={() => resetOfficeImport("default")}
            />
          ) : (
            <OfficeImportRow
              key={importTargetOffice.id}
              officeKey={importTargetOffice.id}
              officeName={importTargetOffice.name}
              officeId={importTargetOffice.id}
              active={importTargetOffice.active}
              phase={getImportPhase(importTargetOffice.id)}
              onImport={() => handleImportOffice(importTargetOffice.id, importTargetOffice.id)}
              onReset={() => resetOfficeImport(importTargetOffice.id)}
            />
          )}
        </div>
      </div>}

      {/* ── Contact status filter tabs ─────────────────────────────────── */}
      {!isLoading && (referrers ?? []).length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl self-start flex-wrap">
          {(
            [
              { key: "all",           label: "All" },
              { key: "not_contacted", label: "Not yet contacted" },
              { key: "contacted",     label: "Contacted" },
              { key: "active",        label: "Active referrers" },
            ] as { key: ContactFilter; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setContactFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                contactFilter === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────── */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-card rounded-2xl border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4 border-b border-border flex gap-4">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-4 w-28 bg-muted rounded" />
              </div>
            ))}
          </div>
        )
      ) : filteredReferrers.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <QrCode className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">No patients found</h3>
          <p className="text-muted-foreground mb-6">You don't have any referrers matching that search.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-secondary hover:bg-muted text-foreground rounded-xl font-semibold transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Patient
          </button>
        </div>

      ) : viewMode === "list" ? (
        /* ── LIST VIEW ──────────────────────────────────────────────────── */
        <>
          {/* ── Mobile card list — replaces the 8-column table on small screens ── */}
          {/* Prevents mobile Safari from crashing on wide tables with many rows   */}
          <div className="block sm:hidden bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
            {mobileSortedReferrers.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">No patients match your search.</p>
            ) : (
              <div className="divide-y divide-border">
                {mobileSortedReferrers.map((referrer) => {
                  const code      = (referrer as any).referral_code as string | null;
                  const tier      = (referrer as any).tier as string | null;
                  const n         = referrer.total_referrals;
                  const onboarded = !!((referrer as any).onboarding_sms_sent);
                  const optedOut  = !!((referrer as any).sms_opt_out);
                  return (
                    <div key={referrer.id} className={cn("px-4 py-3 flex items-center justify-between gap-3", optedOut && "opacity-60")}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StatusDot n={n} onboarded={onboarded} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground truncate">{referrer.name}</p>
                            {optedOut && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-semibold bg-muted text-muted-foreground border border-border shrink-0">
                                <BellOff className="w-2 h-2" /> No SMS
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                            <TierBadge tier={tier} totalReferrals={n} />
                            {code && (
                              <span className="font-mono px-1 py-0.5 rounded bg-background border border-border text-primary" style={{ fontSize: "10px" }}>
                                {code}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground tabular-nums">{n} ref{n !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setQrModalReferrerId(referrer.id)}
                          title="Get QR Code"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors border border-border"
                        >
                          <QrCode className="w-3 h-3" />
                          QR
                        </button>
                        <button
                          onClick={() => openSendLinkModal(referrer.id)}
                          title="Send Referral Link"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors border border-primary/20"
                        >
                          <Send className="w-3 h-3" />
                          Send
                        </button>
                        <SmsToggle
                          optedOut={optedOut}
                          loading={optOutLoadingIds.has(referrer.id)}
                          onClick={() => handleToggleOptOut(referrer.id, referrer.name, optedOut)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!showAllMobile && sortedReferrers.length > MOBILE_ROW_LIMIT && (
              <div className="py-4 text-center border-t border-border">
                <button
                  onClick={() => setShowAllMobile(true)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Show all {sortedReferrers.length} patients
                </button>
              </div>
            )}
          </div>

          {/* ── Desktop table — hidden on mobile to prevent Safari OOM crash ── */}
          <div className="hidden sm:block bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <colgroup>
                  <col style={{ minWidth: "220px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ width: "130px" }} />
                  <col style={{ minWidth: "180px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "72px" }} />
                  <col style={{ minWidth: "160px" }} />
                  <col style={{ width: "1px" }} />
                </colgroup>
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {thSortBtn("name", "Patient Name")}
                    {thStatic("ID")}
                    {thStatic("Phone")}
                    {thStatic("Email")}
                    {thStatic("Ref. Code")}
                    {thSortBtn("total_referrals", "Refs")}
                    {thSortBtn("total_rewards_issued", "Rwds")}
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        Auto SMS
                        <span
                          title="Controls whether this patient receives an automatic referral link SMS 2 hours after their visit."
                          className="cursor-help opacity-50 hover:opacity-100 transition-opacity"
                        >
                          <Info className="w-3 h-3" />
                        </span>
                      </span>
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right sticky right-0 bg-muted/30 border-l border-border whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedReferrers.map((referrer) => {
                    const phone     = (referrer as any).phone as string | null;
                    const email     = (referrer as any).email as string | null;
                    const code      = (referrer as any).referral_code as string | null;
                    const tier      = (referrer as any).tier as string | null;
                    const n         = referrer.total_referrals;
                    const onboarded = !!((referrer as any).onboarding_sms_sent);
                    const optedOut  = !!((referrer as any).sms_opt_out);
                    return (
                      <tr key={referrer.id} className={cn("hover:bg-muted/10 transition-colors group", optedOut && "opacity-60")}>
                        {/* Patient Name + status dot + tier */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <StatusDot n={n} onboarded={onboarded} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground text-sm leading-tight">{referrer.name}</span>
                              </div>
                              <div className="mt-0.5">
                                <TierBadge tier={tier} totalReferrals={n} />
                                <TierProgress tier={tier} totalReferrals={n} />
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Patient ID */}
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono tabular-nums">
                          {referrer.patient_id}
                        </td>
                        {/* Phone */}
                        <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                          {isValidPhone(phone) ? phone : <span className="opacity-30">—</span>}
                        </td>
                        {/* Email — truncate, full on hover tooltip */}
                        <td className="px-4 py-2.5 max-w-0">
                          {email
                            ? <span
                                title={email}
                                className="block text-sm text-muted-foreground truncate overflow-hidden whitespace-nowrap"
                              >{email}</span>
                            : <span className="opacity-30 text-sm">—</span>}
                        </td>
                        {/* Referral Code — single line, 11px */}
                        <td className="px-4 py-2.5">
                          {code
                            ? <span className="font-mono px-1.5 py-0.5 rounded bg-background border border-border text-primary whitespace-nowrap overflow-hidden" style={{ fontSize: "11px" }}>
                                {code}
                              </span>
                            : <span className="opacity-30 text-sm">—</span>}
                        </td>
                        {/* Referrals */}
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-display font-bold text-foreground">{n}</span>
                        </td>
                        {/* Rewards */}
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-display font-bold text-foreground">{referrer.total_rewards_issued}</span>
                        </td>
                        {/* Auto SMS status cell */}
                        <td className="px-4 py-2.5">
                          <SmsStatusCell
                            onboarded={onboarded}
                            optedOut={optedOut}
                            referrerId={referrer.id}
                            referrerName={referrer.name}
                            loading={optOutLoadingIds.has(referrer.id)}
                            showConfirm={confirmPopover?.id === referrer.id}
                            onToggleClick={() => {
                              if (confirmPopover?.id === referrer.id) {
                                setConfirmPopover(null);
                              } else {
                                setConfirmPopover({ id: referrer.id, name: referrer.name, optedOut });
                              }
                            }}
                            onConfirm={handleConfirmOptOut}
                            onCancel={() => setConfirmPopover(null)}
                          />
                        </td>
                        {/* Actions — sticky right */}
                        <td className="px-4 py-2.5 sticky right-0 bg-card border-l border-border">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setQrModalReferrerId(referrer.id)}
                              title="Get QR Code"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors border border-border whitespace-nowrap"
                            >
                              <QrCode className="w-3 h-3" />
                              QR
                            </button>
                            <button
                              onClick={() => openSendLinkModal(referrer.id)}
                              title="Send Referral Link"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors border border-primary/20 whitespace-nowrap"
                            >
                              <Send className="w-3 h-3" />
                              Send
                            </button>
                            <button
                              onClick={() => navigate(`/events?referrer=${encodeURIComponent(referrer.name)}`)}
                              title="View Events"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors border border-border whitespace-nowrap"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Events
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-right">
            Showing {sortedReferrers.length} patient{sortedReferrers.length !== 1 ? "s" : ""}
            {referrers && referrers.length !== sortedReferrers.length && ` of ${referrers.length}`}
          </p>
        </>

      ) : (
        /* ── GRID / TILE VIEW ───────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReferrers.map((referrer) => {
            const gridOptedOut = !!((referrer as any).sms_opt_out);
            return (
            <div key={referrer.id} className={cn("bg-card rounded-2xl border border-border p-6 hover:shadow-xl transition-all duration-300 flex flex-col group", gridOptedOut && "opacity-60")}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-foreground">{referrer.name}</h3>
                    {gridOptedOut && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                        <BellOff className="w-2.5 h-2.5" /> No SMS
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <TierBadge tier={(referrer as any).tier} totalReferrals={referrer.total_referrals} />
                  </div>
                  <p className="text-sm text-muted-foreground font-mono mt-1">ID: {referrer.patient_id}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {referrer.name.charAt(0)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-background rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Referrals</p>
                  <p className="text-2xl font-display font-bold text-foreground">{referrer.total_referrals}</p>
                  <TierProgress tier={(referrer as any).tier} totalReferrals={referrer.total_referrals} />
                </div>
                <div className="bg-background rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rewards</p>
                  <p className="text-2xl font-display font-bold text-foreground">{referrer.total_rewards_issued}</p>
                </div>
              </div>

              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => setQrModalReferrerId(referrer.id)}
                  className="flex-1 py-2.5 bg-secondary group-hover:bg-muted text-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <QrCode className="w-4 h-4" />
                  QR Code
                </button>
                <button
                  onClick={() => openSendLinkModal(referrer.id)}
                  className="flex-1 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm border border-primary/20"
                >
                  <Send className="w-4 h-4" />
                  Send Link
                </button>
                <SmsToggle
                  optedOut={gridOptedOut}
                  loading={optOutLoadingIds.has(referrer.id)}
                  onClick={() => handleToggleOptOut(referrer.id, referrer.name, gridOptedOut)}
                />
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* ── Add Referrer Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); reset(); }}
        title="Add New Referrer"
        description="Enroll a patient in the referral program to generate their custom QR code."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
            <input
              {...register("name")}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
              placeholder="e.g. Jane Doe"
            />
            {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Patient Management ID</label>
            <input
              {...register("patient_id")}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
              placeholder="e.g. PT-12345"
            />
            {errors.patient_id && <p className="text-destructive text-xs mt-1">{errors.patient_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
            <input
              {...register("phone")}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
              placeholder="(555) 123-4567"
            />
            {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email (Optional)</label>
            <input
              {...register("email")}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-foreground"
              placeholder="jane@example.com"
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
          </div>
          {offices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                Location
                {isStaff && <Lock className="w-3 h-3 text-muted-foreground" />}
              </label>
              <select
                {...register("office_id")}
                disabled={isStaff}
                className={cn(
                  "w-full px-4 py-2.5 bg-background border border-border rounded-xl transition-all text-foreground",
                  isStaff
                    ? "opacity-60 cursor-not-allowed"
                    : "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                )}
              >
                {offices.map(office => {
                  const d = office.name.lastIndexOf("–");
                  const displayName = d !== -1 ? office.name.slice(d + 2).trim() : office.name;
                  return (
                    <option key={office.id} value={office.id}>{displayName}</option>
                  );
                })}
              </select>
              {isStaff && (
                <p className="text-muted-foreground text-xs mt-1">Locked to your assigned location.</p>
              )}
              {errors.office_id && <p className="text-destructive text-xs mt-1">{errors.office_id.message}</p>}
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(false); reset(); }}
              className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createReferrer.isPending}
              className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createReferrer.isPending ? "Adding..." : "Add Patient"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── QR Code Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!qrModalReferrerId}
        onClose={() => setQrModalReferrerId(null)}
        title="Patient QR Code"
      >
        <div className="flex flex-col items-center">
          {/* Clickable QR canvas — opens referral URL in new tab */}
          <a
            href={effectiveQrUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            title="Open referral link"
            className="block bg-white p-4 rounded-2xl shadow-inner mb-2 hover:opacity-90 transition-opacity cursor-pointer"
            onClick={e => { if (!effectiveQrUrl) e.preventDefault(); }}
          >
            <canvas ref={canvasRef} className="rounded-lg w-64 h-64 mx-auto" />
          </a>
          <p className="text-xs text-muted-foreground mb-5">Click QR to open link</p>

          <div className="w-full space-y-3">
            <p className="text-sm font-medium text-foreground text-center">Share this link directly:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={effectiveQrUrl || (isDemo ? "Loading demo…" : "Loading...")}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-muted-foreground outline-none font-mono truncate"
              />
              <button
                onClick={copyLink}
                title="Copy link"
                className="p-3 bg-secondary hover:bg-muted text-foreground rounded-xl transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <a
              href={effectiveQrUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => { if (!effectiveQrUrl) e.preventDefault(); }}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Link
            </a>
            {qrModalReferrerId && (
              <button
                onClick={() => {
                  setQrModalReferrerId(null);
                  openSendLinkModal(qrModalReferrerId);
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-sm font-semibold transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Referral Link
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Send Referral Link Modal ──────────────────────────────────── */}
      <Modal
        isOpen={!!sendLinkModalReferrerId}
        onClose={() => setSendLinkModalReferrerId(null)}
        title="Send Referral Link"
        description={`Send ${sendLinkReferrer?.name as string ?? "this patient"} their unique referral link by SMS or email.`}
      >
        {sendResult ? (
          /* ── Result view ── */
          <div className="space-y-4">
            <div className="space-y-2">
              {sendResult.sms && (
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium",
                  sendResult.sms.status === "sent"
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>
                    SMS: {sendResult.sms.status === "sent" ? "Delivered" : `Failed — ${sendResult.sms.reason ?? "unknown error"}`}
                  </span>
                </div>
              )}
              {sendResult.email && (
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium",
                  sendResult.email.status === "sent"
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : sendResult.email.status === "skipped"
                      ? "bg-muted/50 border-border text-muted-foreground"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Email: {
                      sendResult.email.status === "sent" ? "Delivered"
                      : sendResult.email.status === "skipped" ? "No email on file"
                      : `Failed — ${sendResult.email.reason ?? "unknown error"}`
                    }
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSendResult(null)}
                className="flex-1 py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-colors text-sm"
              >
                Send Again
              </button>
              <button
                onClick={() => setSendLinkModalReferrerId(null)}
                className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors text-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Compose view ── */
          <div className="space-y-5">
            {/* Referral URL preview */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Referral Link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={sendLinkUrl ?? "Loading…"}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs text-muted-foreground font-mono truncate outline-none"
                />
                <button
                  onClick={() => sendLinkUrl && navigator.clipboard.writeText(sendLinkUrl)}
                  title="Copy link"
                  className="p-2 bg-secondary hover:bg-muted text-foreground rounded-xl transition-colors border border-border"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Channel selector */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Send via</p>
              <div className="flex gap-2">
                {/* SMS toggle */}
                {(() => {
                  const phone = sendLinkReferrer?.phone as string | null;
                  const hasPhone = isValidPhone(phone);
                  return (
                    <button
                      type="button"
                      disabled={!hasPhone}
                      onClick={() => setSendChannelSms(v => !v)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1.5 py-3 px-3 rounded-xl border font-medium text-sm transition-all",
                        sendChannelSms && hasPhone
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : !hasPhone
                            ? "opacity-40 cursor-not-allowed bg-muted border-border text-muted-foreground"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-border/80"
                      )}
                    >
                      <Phone className="w-4 h-4" />
                      <span>SMS</span>
                      <span className="text-xs font-normal opacity-70 truncate max-w-full px-1">
                        {hasPhone ? phone : "No phone"}
                      </span>
                    </button>
                  );
                })()}

                {/* Email toggle */}
                {(() => {
                  const email = sendLinkReferrer?.email as string | null;
                  const hasEmail = !!email;
                  return (
                    <button
                      type="button"
                      disabled={!hasEmail}
                      onClick={() => setSendChannelEmail(v => !v)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1.5 py-3 px-3 rounded-xl border font-medium text-sm transition-all",
                        sendChannelEmail && hasEmail
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : !hasEmail
                            ? "opacity-40 cursor-not-allowed bg-muted border-border text-muted-foreground"
                            : "bg-muted/40 border-border text-muted-foreground hover:border-border/80"
                      )}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                      <span className="text-xs font-normal opacity-70 truncate max-w-full px-1">
                        {hasEmail ? email : "No email"}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Editable message */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Message <span className="font-normal opacity-60">(optional — leave blank for default)</span>
              </p>
              <textarea
                value={sendCustomMessage}
                onChange={e => setSendCustomMessage(e.target.value)}
                rows={3}
                placeholder={`Hi ${(sendLinkReferrer?.name as string ?? "").split(" ")[0] || "[Patient]"} — thanks for being a Hallmark Dental patient! Share your personal link with anyone looking for a great dentist…`}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSendLinkModalReferrerId(null)}
                className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSendLink}
                disabled={sendLoading || (!sendChannelSms && !sendChannelEmail)}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Send Link</>
                }
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Bulk Send Referral Links Modal ────────────────────────────── */}
      <Modal
        isOpen={bulkSendOpen}
        onClose={() => { if (!bulkSending) setBulkSendOpen(false); }}
        title="Send All Referral Links"
        description={`Send referral links to patients who have not yet received one.`}
      >
        {bulkResult ? (
          /* ── Result view ── */
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-display font-bold text-green-400">{bulkResult.sent}</p>
                <p className="text-xs text-green-400/80 font-medium mt-0.5">Sent</p>
              </div>
              <div className={cn(
                "border rounded-xl p-3 text-center",
                bulkResult.failed > 0
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-muted/40 border-border"
              )}>
                <p className={cn("text-2xl font-display font-bold", bulkResult.failed > 0 ? "text-red-400" : "text-muted-foreground")}>
                  {bulkResult.failed}
                </p>
                <p className={cn("text-xs font-medium mt-0.5", bulkResult.failed > 0 ? "text-red-400/80" : "text-muted-foreground/60")}>Failed</p>
              </div>
              <div className="bg-muted/40 border border-border rounded-xl p-3 text-center">
                <p className="text-2xl font-display font-bold text-muted-foreground">{bulkResult.skipped}</p>
                <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">Skipped</p>
              </div>
            </div>

            {bulkResult.errors.length > 0 && (
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3 max-h-32 overflow-y-auto space-y-1">
                <p className="text-xs font-semibold text-red-400 mb-1.5">Errors</p>
                {bulkResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400/80 font-mono leading-snug">{e}</p>
                ))}
              </div>
            )}

            <button
              onClick={() => setBulkSendOpen(false)}
              className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Confirm view ── */
          <div className="space-y-5">
            {/* Patient count */}
            <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm text-foreground">
                <span className="font-bold text-primary">{unsentCount}</span>{" "}
                patient{unsentCount !== 1 ? "s" : ""} {unsentCount !== 1 ? "have" : "has"} not yet received a referral link.
              </p>
            </div>

            {/* Channel selector */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Send via</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBulkChannelSms(s => !s)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-sm transition-all",
                    bulkChannelSms
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-border/80"
                  )}
                >
                  <Phone className="w-4 h-4" />
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() => setBulkChannelEmail(s => !s)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-sm transition-all",
                    bulkChannelEmail
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-border/80"
                  )}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/90 leading-relaxed">
                This sends <strong>one message per patient</strong> and cannot be undone. Patients with no contact info for the selected channel will be skipped.
              </p>
            </div>

            {/* Spinner overlay while sending */}
            {bulkSending && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Sending… this may take a minute</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setBulkSendOpen(false)}
                disabled={bulkSending}
                className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSend}
                disabled={bulkSending || (!bulkChannelSms && !bulkChannelEmail) || unsentCount === 0}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkSending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4" /> Send to {unsentCount} Patient{unsentCount !== 1 ? "s" : ""}</>
                }
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
