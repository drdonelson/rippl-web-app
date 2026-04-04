import React from "react";
import { Building2, Construction } from "lucide-react";

export default function OfficesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Offices</h1>
        <p className="text-muted-foreground mt-1">Manage office settings and configurations.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-32 gap-5 rounded-2xl border border-border border-dashed bg-muted/10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-primary/60" />
        </div>
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold mb-3">
            <Construction className="w-3 h-3" />
            Coming Soon
          </div>
          <p className="text-xl font-semibold text-foreground">Office management</p>
          <p className="text-muted-foreground text-sm mt-2">
            View and edit office details, Open Dental keys, and per-location settings.
          </p>
        </div>
      </div>
    </div>
  );
}
