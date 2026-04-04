import React from "react";
import { TrendingUp, Construction } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Platform-wide referral and reward insights.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-32 gap-5 rounded-2xl border border-border border-dashed bg-muted/10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-primary/60" />
        </div>
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold mb-3">
            <Construction className="w-3 h-3" />
            Coming Soon
          </div>
          <p className="text-xl font-semibold text-foreground">Analytics dashboard</p>
          <p className="text-muted-foreground text-sm mt-2">
            Referral conversion rates, reward trends, and location performance — coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
