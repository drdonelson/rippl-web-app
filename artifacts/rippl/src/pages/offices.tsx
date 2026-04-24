import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Upload, X, Loader2, ImageIcon, CheckCircle2 } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface Office {
  id: string;
  name: string;
  location_code: string;
  logo_url: string | null;
  active: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function OfficeLogoCard({ office }: { office: Office }) {
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
        <div>
          <p className="font-semibold text-foreground">{office.name}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{office.location_code}</p>
        </div>
        {!office.active && (
          <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
        )}
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

export default function OfficesPage() {
  const { profile } = useAuth();

  const { data: offices = [], isLoading, error } = useQuery<Office[]>({
    queryKey: ["/api/offices/managed"],
    queryFn: () => customFetch<Office[]>(`${BASE}/api/offices/managed`),
  });

  const isPracticeAdmin = profile?.role === "practice_admin";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          {isPracticeAdmin ? "Office Settings" : "Offices"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isPracticeAdmin
            ? "Manage your practice logo and settings."
            : "Manage all offices and their logos."}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Failed to load offices.</p>
      ) : offices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border border-dashed border-border bg-muted/10">
          <Building2 className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No offices found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offices.map(office => (
            <OfficeLogoCard key={office.id} office={office} />
          ))}
        </div>
      )}
    </div>
  );
}
