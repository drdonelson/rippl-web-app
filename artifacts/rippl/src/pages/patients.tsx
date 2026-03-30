import React, { useState, useRef, useEffect } from "react";
import { useGetReferrers, useCreateReferrer, useGetReferrerQr } from "@workspace/api-client-react";
import { Plus, QrCode, Search, Share2, Copy, Check, Download, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

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

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

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

export default function Patients() {
  const { data: referrers, isLoading } = useGetReferrers();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Import from OD state
  const [importPhase, setImportPhase] = useState<ImportPhase>({ state: "idle" });
  const animFrameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals state
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

  const onSubmit = (data: FormValues) => {
    createReferrer.mutate({ data });
  };

  const { data: qrData } = useGetReferrerQr(qrModalReferrerId || "", {
    query: { enabled: !!qrModalReferrerId }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrData?.referral_url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrData.referral_url, {
        width: 256,
        margin: 2,
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

  // Animate a counter from 0 → target over ~1 second while import runs
  function animateCounter(total: number, onDone: () => void) {
    let current = 0;
    const step = Math.max(1, Math.floor(total / 40));
    const tick = () => {
      current = Math.min(current + step, total);
      setImportPhase({ state: "importing", total, current });
      if (current < total) {
        animFrameRef.current = setTimeout(tick, 25);
      } else {
        onDone();
      }
    };
    tick();
  }

  const handleImport = async () => {
    if (importPhase.state === "fetching" || importPhase.state === "importing") return;

    setImportPhase({ state: "fetching" });

    try {
      // Step 1: fetch OD patient list
      const { patients, total } = await fetchActivePatients();

      if (total === 0) {
        setImportPhase({ state: "done", imported: 0, skipped: 0, total: 0 });
        return;
      }

      // Step 2: start animated counter, kick off actual import in parallel
      let importResult: { imported: number; skipped: number; total: number } | null = null;
      let importDone = false;

      setImportPhase({ state: "importing", total, current: 0 });

      // Run import in background
      const importPromise = importPatients(patients).then(result => {
        importResult = result;
        importDone = true;
        return result;
      });

      // Animate counter until import finishes
      await new Promise<void>(resolve => {
        const tick = () => {
          setImportPhase(prev => {
            if (prev.state !== "importing") return prev;
            const next = Math.min(prev.current + Math.max(1, Math.floor(total / 40)), total);
            return { state: "importing", total, current: next };
          });
          if (!importDone) {
            animFrameRef.current = setTimeout(tick, 30);
          } else {
            resolve();
          }
        };
        animFrameRef.current = setTimeout(tick, 30);
      });

      // Wait for import to finish (it should already be done by now)
      const result = await importPromise;

      queryClient.invalidateQueries({ queryKey: ["/api/referrers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });

      setImportPhase({ state: "done", imported: result.imported, skipped: result.skipped, total: result.total });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setImportPhase({ state: "error", message });
    }
  };

  const resetImport = () => {
    if (animFrameRef.current) clearTimeout(animFrameRef.current);
    setImportPhase({ state: "idle" });
  };

  const filteredReferrers = referrers?.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isImporting = importPhase.state === "fetching" || importPhase.state === "importing";

  return (
    <div className="space-y-8">
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
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full sm:w-64 transition-all"
            />
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

      {/* ── Open Dental Import Banner ─────────────────────────────────────── */}
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
            {/* Progress / result label */}
            {importPhase.state === "fetching" && (
              <span className="text-xs text-muted-foreground animate-pulse">Connecting to Open Dental…</span>
            )}
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

            {/* Reset button after done / error */}
            {(importPhase.state === "done" || importPhase.state === "error") && (
              <button
                onClick={resetImport}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                title="Reset"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-4 py-2 bg-secondary hover:bg-muted text-foreground text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isImporting ? "Importing…" : "Import from Open Dental"}
            </button>
          </div>
        </div>

        {/* Progress bar */}
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

      {/* ── Referrer Grid ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="h-48 bg-card rounded-2xl border border-border animate-pulse" />
          ))}
        </div>
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
      ) : (
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

      {/* ── Add Referrer Modal ─────────────────────────────────────────────── */}
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

      {/* ── QR Code Modal ─────────────────────────────────────────────────── */}
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
