import React from "react";
import { Store, Plus } from "lucide-react";

export default function PartnersPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Local Partners</h1>
          <p className="text-muted-foreground mt-1">
            Manage local business partners where patients can redeem rewards.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          onClick={() => {}}
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-32 gap-5 rounded-2xl border border-border border-dashed bg-muted/10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Store className="w-10 h-10 text-primary/60" />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-xl font-semibold text-foreground">No partners yet</p>
          <p className="text-muted-foreground text-sm mt-2">
            Add local businesses where patients can redeem their reward PIN in store.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          onClick={() => {}}
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>
    </div>
  );
}
