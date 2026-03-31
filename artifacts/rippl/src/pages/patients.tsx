import React, { useState, useRef, useEffect, useMemo } from "react";
import { useGetReferrers, useCreateReferrer, useGetReferrerQr } from "@workspace/api-client-react";
import {
  Plus, QrCode, Search, Copy, Check, Download, RefreshCw,
  CheckCircle2, AlertTriangle, LayoutList, LayoutGrid,
  ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Star,
} from "lucide-react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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

function getReferrerStatus(totalReferrals: number): { label: string; className: string } {
  if (totalReferrals >= 5) return { label: "Super Referrer", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" };
  if (totalReferrals >= 1) return { label: "Active", className: "bg-green-500/15 text-green-400 border-green-500/30" };
  return { label: "New", className: "bg-muted/80 text-muted-foreground border-border" };
}

async function fetchActivePatients() {
  const res = await fetch(`${BASE}/api/opendental/patients/active`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ patients: unknown[]; total: number }>;
}

async function importPatients(patients: unknown[]) {
  const res = await fetch(`${BASE}/api/opendental/patients/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patients),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ imported: number; skipped: number; total: number; errors: string[] }>;
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

  // Import state
  const [importPhase, setImportPhase] = useState<ImportPhase>({ state: "idle" });
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    query: { enabled: !!qrModalReferrerId }
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

  const handleImport = async () => {
    if (importPhase.state === "fetching" || importPhase.state === "importing") return;
    setImportPhase({ state: "fetching" });
    try {
      const { patients, total } = await fetchActivePatients();
      if (total === 0) { setImportPhase({ state: "done", imported: 0, skipped: 0, total: 0 }); return; }

      let importResult: { imported: number; skipped: number; total: number } | null = null;
      let importDone = false;
      setImportPhase({ state: "importing", total, current: 0 });

      const importPromise = importPatients(patients).then(result => {
        importResult = result; importDone = true; return result;
      });

      await new Promise<void>(resolve => {
        const tick = () => {
          setImportPhase(prev => {
            if (prev.state !== "importing") return prev;
            const next = Math.min(prev.current + Math.max(1, Math.floor(total / 40)), total);
            return { state: "importing", total, current: next };
          });
          if (!importDone) { animFrameRef.current = setTimeout(tick, 30); }
          else { resolve(); }
        };
        animFrameRef.current = setTimeout(tick, 30);
      });

      const result = await importPromise;
      queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setImportPhase({ state: "done", imported: result.imported, skipped: result.skipped, total: result.total });
    } catch (err) {
      setImportPhase({ state: "error", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const resetImport = () => {
    if (animFrameRef.current) clearTimeout(animFrameRef.current);
    setImportPhase({ state: "idle" });
  };

  const isImporting = importPhase.state === "fetching" || importPhase.state === "importing";

  // Filter
  const filteredReferrers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (referrers ?? []).filter(r =>
      r.name.toLowerCase().includes(term) ||
      (r.email && r.email.toLowerCase().includes(term)) ||
      (r.referral_code && r.referral_code.toLowerCase().includes(term)) ||
      r.patient_id.toLowerCase().includes(term)
    );
  }, [referrers, searchTerm]);

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

  const thSortBtn = (field: SortField, label: string) => (
    <th className="px-5 py-4 font-semibold text-left">
      <button
        onClick={() => handleSort(field)}
        className={cn(
          "flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold transition-colors",
          sortField === field ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </button>
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

      {/* ── Import Banner ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Import Active Patients</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pull all active patients from Open Dental and enroll them as referrers. Existing patients are skipped automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {importPhase.state === "fetching" && <span className="text-xs text-muted-foreground animate-pulse">Connecting to Open Dental…</span>}
            {importPhase.state === "importing" && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Importing {importPhase.current} / {importPhase.total}…
              </span>
            )}
            {importPhase.state === "done" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                {importPhase.imported} imported, {importPhase.skipped} skipped
              </span>
            )}
            {importPhase.state === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-destructive max-w-xs truncate" title={importPhase.message}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {importPhase.message}
              </span>
            )}
            {(importPhase.state === "done" || importPhase.state === "error") && (
              <button onClick={resetImport} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Reset">
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-4 py-2 bg-secondary hover:bg-muted text-foreground text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isImporting ? "Importing…" : "Import from Open Dental"}
            </button>
          </div>
        </div>
        {importPhase.state === "importing" && importPhase.total > 0 && (
          <div className="mt-4">
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, (importPhase.current / importPhase.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
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
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    {thSortBtn("name", "Patient Name")}
                    <th className="px-5 py-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Patient ID</th>
                    <th className="px-5 py-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Phone</th>
                    <th className="px-5 py-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Email</th>
                    <th className="px-5 py-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Referral Code</th>
                    {thSortBtn("total_referrals", "Referrals")}
                    {thSortBtn("total_rewards_issued", "Rewards")}
                    <th className="px-5 py-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground">Status</th>
                    <th className="px-5 py-4 text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedReferrers.map((referrer) => {
                    const status = getReferrerStatus(referrer.total_referrals);
                    return (
                      <tr key={referrer.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {referrer.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-foreground">{referrer.name}</span>
                            {referrer.total_referrals >= 5 && (
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground font-mono">{referrer.patient_id}</td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{(referrer as any).phone || <span className="opacity-30">—</span>}</td>
                        <td className="px-5 py-4 text-sm text-muted-foreground max-w-[180px] truncate">
                          {(referrer as any).email || <span className="opacity-30">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          {(referrer as any).referral_code ? (
                            <span className="font-mono text-xs px-2 py-1 rounded-lg bg-background border border-border text-primary">
                              {(referrer as any).referral_code}
                            </span>
                          ) : <span className="opacity-30 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-display font-bold text-foreground text-lg">{referrer.total_referrals}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-display font-bold text-foreground text-lg">{referrer.total_rewards_issued}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap", status.className)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setQrModalReferrerId(referrer.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-muted text-foreground text-xs font-semibold rounded-lg transition-colors border border-border"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              Get QR
                            </button>
                            <button
                              onClick={() => navigate(`/events?referrer=${encodeURIComponent(referrer.name)}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors border border-primary/20"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Events
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
