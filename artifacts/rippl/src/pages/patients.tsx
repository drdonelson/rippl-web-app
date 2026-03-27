import React, { useState, useRef, useEffect } from "react";
import { useGetReferrers, useCreateReferrer, useGetReferrerQr } from "@workspace/api-client-react";
import { Plus, QrCode, Search, Share2, Copy, Check } from "lucide-react";
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

export default function Patients() {
  const { data: referrers, isLoading } = useGetReferrers();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [qrModalReferrerId, setQrModalReferrerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form setup
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

  // QR Code fetching & rendering
  const { data: qrData } = useGetReferrerQr(qrModalReferrerId || "", {
    query: { enabled: !!qrModalReferrerId }
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (qrData?.referral_url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrData.referral_url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0a1628', // Dark navy
          light: '#ffffff'
        }
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

  const filteredReferrers = referrers?.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground">Patients & QR</h1>
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

      {/* Add Referrer Modal */}
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

      {/* QR Code Modal */}
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
