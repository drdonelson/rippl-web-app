import React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { LayoutDashboard, CalendarDays, Users, Droplets, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffice } from "@/contexts/office-context";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Referral Events", icon: CalendarDays },
  { href: "/patients", label: "Patients & QR", icon: Users },
];

function OfficePicker({ compact = false }: { compact?: boolean }) {
  const { offices, selectedOfficeId, setSelectedOfficeId, isLoading } = useOffice();

  if (isLoading) return null;

  const allOption = { id: "all", name: "All Locations", location: "all" };
  const options = [allOption, ...offices];
  const selected = options.find(o => o.id === selectedOfficeId) ?? allOption;

  const shortName = (name: string) => {
    if (name === "All Locations") return "All Locations";
    // "Hallmark Dental – Brentwood" → "Brentwood"
    const dash = name.lastIndexOf("–");
    return dash !== -1 ? name.slice(dash + 2).trim() : name;
  };

  return (
    <div className={cn("relative", compact ? "w-full" : "")}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <select
          value={selectedOfficeId}
          onChange={e => setSelectedOfficeId(e.target.value)}
          className={cn(
            "w-full appearance-none bg-muted/40 border border-border rounded-lg text-sm font-medium text-foreground",
            "pl-8 pr-7 py-2 cursor-pointer hover:bg-muted/70 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50",
            compact ? "text-xs py-1.5" : ""
          )}
        >
          {options.map(o => (
            <option key={o.id} value={o.id}>
              {compact ? shortName(o.name) : o.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { selectedOffice, selectedOfficeId } = useOffice();

  const subtitleText = selectedOfficeId === "all"
    ? "All Locations"
    : selectedOffice
      ? (() => {
          const name = selectedOffice.name;
          const dash = name.lastIndexOf("–");
          return dash !== -1 ? name.slice(dash + 2).trim() : name;
        })()
      : "Hallmark Dental";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex w-72 border-r border-border bg-card/30 backdrop-blur-xl flex-col shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Droplets className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground leading-none">Rippl</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
              {subtitleText}
            </p>
          </div>
        </div>

        {/* Office selector */}
        <div className="px-4 mb-4">
          <OfficePicker />
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group relative",
                  isActive
                    ? "text-primary-foreground bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-5 h-5 relative z-10", isActive ? "text-primary" : "")} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <h4 className="font-display font-semibold text-foreground mb-1">Need help?</h4>
            <p className="text-sm text-muted-foreground mb-4">Contact support for assistance with rewards.</p>
            <button className="w-full py-2.5 bg-background hover:bg-muted rounded-lg text-sm font-semibold transition-colors border border-border">
              Support Center
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content — full width on mobile */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Mobile top header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/50 backdrop-blur-xl shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
            <Droplets className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-base font-display font-bold text-foreground leading-none shrink-0">Rippl</span>
          <div className="flex-1 min-w-0">
            <OfficePicker compact />
          </div>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Scrollable content — adds bottom padding on mobile for the tab bar */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-24 md:pb-8 z-0">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-6xl mx-auto w-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Bottom Tab Bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border flex items-stretch safe-area-bottom">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                isActive ? "bg-primary/15" : ""
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-semibold leading-none",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label === "Referral Events" ? "Events" : item.label === "Patients & QR" ? "Patients" : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
