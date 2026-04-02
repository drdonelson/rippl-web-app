import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CalendarDays, Users, Droplets,
  ChevronDown, MapPin, LogOut, AlertTriangle, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffice } from "@/contexts/office-context";
import { useAuth } from "@/contexts/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",      icon: LayoutDashboard },
  { href: "/events",    label: "Referral Events", icon: CalendarDays    },
  { href: "/patients",  label: "Patients & QR",   icon: Users           },
];

function OfficePicker({ compact = false }: { compact?: boolean }) {
  const { offices, selectedOfficeId, setSelectedOfficeId, isLoading } = useOffice();
  const { isDemo } = useAuth();

  if (isLoading) return null;

  // Demo users see a static, non-interactive "Demo Practice" badge
  if (isDemo) {
    return (
      <div className={cn("relative", compact ? "w-full" : "")}>
        <div className="relative flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 cursor-default select-none">
          <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className={cn("font-medium text-yellow-300", compact ? "text-xs" : "text-sm")}>
            Demo Practice
          </span>
        </div>
      </div>
    );
  }

  const allOption = { id: "all", name: "All Locations", location_code: "all", active: true };
  const options   = [allOption, ...offices];

  const shortName = (name: string) => {
    if (name === "All Locations") return "All Locations";
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

// ── Shared sidebar inner content ─────────────────────────────────────────────
function SidebarContent({
  location,
  subtitleText,
  onNavClick,
}: {
  location: string;
  subtitleText: string;
  onNavClick?: () => void;
}) {
  const { user, profile, logout } = useAuth();

  const handleLogout = () => {
    onNavClick?.();
    logout();
  };

  return (
    <>
      {/* Logo */}
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

      {/* Nav items */}
      <nav className="flex-1 px-4 space-y-2 mt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
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

      {/* Bottom: user info + logout */}
      <div className="p-4 mt-auto border-t border-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl group">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary uppercase">
            {(profile?.full_name ?? user?.email ?? "?")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {profile?.full_name ?? "Admin"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location]     = useLocation();
  const { isDemo, logout } = useAuth();
  const { selectedOffice, selectedOfficeId } = useOffice();
  const [mobileOpen, setMobileOpen] = useState(false);

  const subtitleText = selectedOfficeId === "all"
    ? "All Locations"
    : selectedOffice
      ? (() => {
          const name = selectedOffice.name;
          const dash = name.lastIndexOf("–");
          return dash !== -1 ? name.slice(dash + 2).trim() : name;
        })()
      : isDemo ? "Smile Care Dental" : "Hallmark Dental";

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Desktop sidebar — md+ only ──────────────────────────────────── */}
      <aside className="hidden md:flex w-72 border-r border-border bg-card/30 backdrop-blur-xl flex-col shrink-0">
        <SidebarContent location={location} subtitleText={subtitleText} />
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={closeMobile}
            />

            {/* Slide-in panel */}
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.8 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden"
            >
              {/* Close button */}
              <button
                onClick={closeMobile}
                className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>

              <SidebarContent
                location={location}
                subtitleText={subtitleText}
                onNavClick={closeMobile}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">

        {/* Mobile top header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/50 backdrop-blur-xl shrink-0">
          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
            <Droplets className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-base font-display font-bold text-foreground leading-none shrink-0">Rippl</span>

          <div className="flex-1 min-w-0">
            <OfficePicker compact />
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/15 border-b border-yellow-500/30 text-yellow-300 text-xs font-medium shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
            You are viewing a demo — no real patient data is shown
            <button
              onClick={logout}
              className="ml-auto flex items-center gap-1 text-yellow-400 hover:text-yellow-200 transition-colors font-semibold"
            >
              <LogOut className="w-3 h-3" /> Exit demo
            </button>
          </div>
        )}

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Scrollable content — extra bottom padding on mobile for tab bar */}
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

      {/* ── Bottom tab bar — mobile only ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border flex items-stretch safe-area-bottom">
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
