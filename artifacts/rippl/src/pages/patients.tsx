import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useGetReferrers, useCreateReferrer, useGetReferrerQr, getGetReferrerQrQueryKey, customFetch } from "@workspace/api-client-react";
import {
  Plus, QrCode, Search, Copy, Check, Download, RefreshCw,
  CheckCircle2, AlertTriangle, LayoutList, LayoutGrid,
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Star, MapPin, Lock,
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

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  patient_id: z.string().min(1, "Patient ID is required"),
  phone: z.string().min(10, "Valid phone is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

type ImportPhase =
  | { state: "idle" }
  | { state: "fetching" }
  | { state: "importing"; total: number; current: number }
  | { state: "done"; imported: number; skipped: number; total: number }
  | { state: "error"; message: string };

type ViewMode = "list" | "grid";
type SortField = "name" | "total_referrals" | "total_rewards_issued";
type SortDir = "asc" | "desc";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return (phone.replace(/\D/g, "").length >= 7);
}

function StatusDot({ n }: { n: number }) {
  if (n >= 5) return <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />;
  if (n >= 1) return <span className="w-2 h-2 rounded-full bg-primary shrink-0 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0 inline-block" />;
}

// ── Import job API helpers ────────────────────────────────────────────────
interface JobStatus {
  id: string;
  status: "running" | "done" | "error";
  imported: number;
  skipped: number;
  total_od: number;
  pages_fetched: number;
  error: string | null;
}

async function startImportJob(officeId: string | null): Promise<string> {
  const result = await customFetch<{ job_id: string }>(
    `${BASE}/api/import/patients`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ office_id: officeId }),
    }
  );
  return result.job_id;
}

async function getJobStatus(jobId: string): Promise<JobStatus> {
  return customFetch<JobStatus>(`${BASE}/api/import/status/${jobId}`);
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
  const isWorking = phase.state === "fetching" || phase.state === "importing";
  const displayName = officeName.replace("Hallmark Dental – ", "").replace("Hallmark Dental - ", "");

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
          {phase.state === "fetching" && (
            <span className="text-xs text-muted-foreground animate-pulse hidden sm:inline">Starting…</span>
          )}
          {phase.state === "importing" && (
            <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
              {phase.total > 0
                ? `${phase.current} of ~${phase.total} imported`
                : `${phase.current} imported…`}
            </span>
          )}
          {phase.state === "done" && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {phase.imported} new, {phase.skipped} skipped
            </span>
          )}
          {phase.state === "error" && (
            <span className="flex items-center gap-1 text-xs text-destructive max-w-[240px]" title={phase.message}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{phase.message}</span>
            </span>
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

      {phase.state === "importing" && phase.total > 0 && (
        <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-75"
            style={{ width: `${Math.min(100, (phase.current / phase.total) * 100)}%` }}
          />
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

export default function Patients() {
  const { data: referrers, isLoading } = useGetReferrers();
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

  // Per-office import state: officeId (or "default") → ImportPhase
  const [importPhases, setImportPhases] = useState<Map<string, ImportPhase>>(new Map());
  const animFrameRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema)
  });

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
    query: { queryKey: getGetReferrerQrQueryKey(qrModalReferrerId || ""), enabled: !!qrModalReferrerId }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrData?.referral_url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrData.referral_url, {
        width: 256, margin: 2,
        color: { dark: '#0a1628', light: '#ffffff' }
      });
    }
  }, [qrData]);

  const copyLink = () => {
    if (qrData?.referral_url) {
      navigator.clipboard.writeText(qrData.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImportOffice = useCallback(async (officeKey: string, officeId: string | null) => {
    const phase = getImportPhase(officeKey);
    if (phase.state === "fetching" || phase.state === "importing") return;

    setOfficeImportPhase(officeKey, { state: "fetching" });

    try {
      // Fire the background job — returns immediately with a job_id
      const jobId = await startImportJob(officeId);

      // Transition to importing state and start polling
      setOfficeImportPhase(officeKey, { state: "importing", total: 0, current: 0 });

      const POLL_MS = 3000;

      const poll = async () => {
        try {
          const status = await getJobStatus(jobId);

          if (status.status === "running") {
            setOfficeImportPhase(officeKey, {
              state: "importing",
              total:   status.total_od,
              current: status.imported,
            });
            animFrameRefs.current.set(officeKey, setTimeout(poll, POLL_MS));

          } else if (status.status === "done") {
            setOfficeImportPhase(officeKey, {
              state:    "done",
              imported: status.imported,
              skipped:  status.skipped,
              total:    status.total_od,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
            toast.success(`Import complete — ${status.imported} patients added`, {
              description: status.skipped > 0
                ? `${status.skipped} already existed and were skipped.`
                : "All patients are new enrollees.",
              duration: 6000,
            });

          } else {
            const msg = status.error ?? "Import failed";
            setOfficeImportPhase(officeKey, { state: "error", message: msg });
            toast.error("Import failed", { description: msg, duration: 8000 });
          }
        } catch (pollErr) {
          const msg = pollErr instanceof Error ? pollErr.message : String(pollErr);
          setOfficeImportPhase(officeKey, { state: "error", message: msg });
          toast.error("Import check failed", { description: msg, duration: 8000 });
        }
      };

      // First poll after 3 seconds
      animFrameRefs.current.set(officeKey, setTimeout(poll, POLL_MS));

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOfficeImportPhase(officeKey, { state: "error", message });
      toast.error("Failed to start import", { description: message, duration: 8000 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const resetOfficeImport = (key: string) => {
    const timer = animFrameRefs.current.get(key);
    if (timer) { clearTimeout(timer); animFrameRefs.current.delete(key); }
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
      return (
        r.name.toLowerCase().includes(term) ||
        (r.email && r.email.toLowerCase().includes(term)) ||
        (r.referral_code && r.referral_code.toLowerCase().includes(term)) ||
        r.patient_id.toLowerCase().includes(term)
      );
    });
  }, [referrers, searchTerm, selectedOfficeId]);

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

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Patients & QR</h1>
          <p className="text-muted-foreground mt-2">Manage your referrers and generate custom QR codes.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-64 transition-all"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setView("list")}
              title="List view"
              className={cn(
                "p-2.5 transition-colors",
                viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              title="Grid view"
              className={cn(
                "p-2.5 transition-colors",
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Patient
          </button>
        </div>
      </div>

      {/* ── Import from Open Dental ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Import from Open Dental</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pull active patients per office and enroll them as referrers. Existing patients are skipped automatically.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {offices.length === 0 ? (
            /* Fallback: single import when offices haven't loaded yet */
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
            (() => {
              const visibleOffices = selectedOfficeId === "all"
                ? offices
                : offices.filter(o => o.id === selectedOfficeId);
              return visibleOffices.map(office => (
                <OfficeImportRow
                  key={office.id}
                  officeKey={office.id}
                  officeName={office.name}
                  officeId={office.id}
                  active={office.active}
                  phase={getImportPhase(office.id)}
                  onImport={() => handleImportOffice(office.id, office.id)}
                  onReset={() => resetOfficeImport(office.id)}
                />
              ));
            })()
          )}
        </div>
      </div>

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
          <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
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
                    <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right sticky right-0 bg-muted/30 border-l border-border whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedReferrers.map((referrer) => {
                    const phone = (referrer as any).phone as string | null;
                    const email = (referrer as any).email as string | null;
                    const code  = (referrer as any).referral_code as string | null;
                    const n     = referrer.total_referrals;
                    return (
                      <tr key={referrer.id} className="hover:bg-muted/10 transition-colors group">
                        {/* Patient Name + status dot */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <StatusDot n={n} />
                            <span className="font-semibold text-foreground text-sm leading-tight">{referrer.name}</span>
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
                        {/* Actions — sticky right */}
                        <td className="px-4 py-2.5 sticky right-0 bg-card border-l border-border">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setQrModalReferrerId(referrer.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors border border-border whitespace-nowrap"
                            >
                              <QrCode className="w-3 h-3" />
                              QR
                            </button>
                            <button
                              onClick={() => navigate(`/events?referrer=${encodeURIComponent(referrer.name)}`)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors border border-primary/20 whitespace-nowrap"
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
          {filteredReferrers.map((referrer) => (
            <div key={referrer.id} className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{referrer.name}</h3>
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
                </div>
                <div className="bg-background rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rewards</p>
                  <p className="text-2xl font-display font-bold text-foreground">{referrer.total_rewards_issued}</p>
                </div>
              </div>

              <button
                onClick={() => setQrModalReferrerId(referrer.id)}
                className="mt-auto w-full py-3 bg-secondary group-hover:bg-primary group-hover:text-primary-foreground text-foreground rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                Get QR Code
              </button>
            </div>
          ))}
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
          <div className="bg-white p-4 rounded-2xl shadow-inner mb-6">
            <canvas ref={canvasRef} className="rounded-lg w-64 h-64 mx-auto" />
          </div>
          <div className="w-full space-y-3">
            <p className="text-sm font-medium text-foreground text-center mb-2">Share this link directly:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={qrData?.referral_url || "Loading..."}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-muted-foreground outline-none font-mono truncate"
              />
              <button
                onClick={copyLink}
                className="p-3 bg-secondary hover:bg-muted text-foreground rounded-xl transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
