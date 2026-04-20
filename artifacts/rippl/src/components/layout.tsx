import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CalendarDays, Users, Droplets,
  ChevronDown, MapPin, LogOut, AlertTriangle, Menu, X,
  Store, CheckSquare, Building2, TrendingUp, ExternalLink,
  GraduationCap, Link2, Shield, FileText, Gift, Megaphone, UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffice } from "@/contexts/office-context";
import { useAuth, type UserRole } from "@/contexts/auth-context";

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  external?: boolean;
  minRole?: "practice_admin" | "super_admin";
};

type NavSection = {
  label?: string;
  minRole?: "practice_admin" | "super_admin";
  demoVisible?: boolean;
  demoOnly?: boolean;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard",       icon: LayoutDashboard },
      { href: "/events",    label: "Referral Events",  icon: CalendarDays    },
      { href: "/patients",  label: "Patients",           icon: Users           },
    ],
  },
  {
    label: "Manage",
    minRole: "practice_admin",
    items: [
      { href: "/partners",    label: "Local Partners", icon: Store,       minRole: "super_admin"    },
      { href: "/campaigns",   label: "Campaigns",      icon: Megaphone                              },
      { href: "/admin-tasks", label: "Admin Tasks",    icon: CheckSquare                            },
      { href: "/offices",     label: "Offices",        icon: Building2,   minRole: "super_admin"    },
    ],
  },
  {
    label: "Platform",
    minRole: "super_admin",
    items: [
      { href: "/onboard",   label: "Onboard",   icon: GraduationCap },
      { href: "/analytics", label: "Analytics", icon: TrendingUp    },
    ],
  },
  {
    label: "Manage",
    demoVisible: true,
    demoOnly: true,
    items: [
      { href: "/campaigns", label: "Campaigns",      icon: Megaphone },
      { href: "/staff",     label: "Staff Accounts", icon: UserCog   },
    ],
  },
  {
    label: "Analytics",
    demoVisible: true,
    demoOnly: true,
    items: [
      { href: "/analytics", label: "Analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Patient Links",
    minRole: "super_admin",
    demoVisible: true,
    items: [
      { href: "https://www.joinrippl.com/how-it-works",                                    label: "How It Works",      icon: Link2,    external: true },
      { href: "https://www.joinrippl.com/privacy",                                         label: "Privacy Policy",    icon: Shield,   external: true, minRole: "super_admin" },
      { href: "https://www.joinrippl.com/terms",                                           label: "Terms",             icon: FileText, external: true, minRole: "super_admin" },
      { href: "https://www.joinrippl.com/claim?token=demo-claim-preview-token-screenshot", label: "Demo Claim Page",  icon: Gift,     external: true },
    ],
  },
];

// Core items shown in the mobile bottom tab bar (always visible)
const TAB_BAR_ITEMS = NAV_SECTIONS[0].items;

function roleLevel(role: UserRole | undefined): number {
  if (role === "super_admin") return 3;
  if (role === "practice_admin") return 2;
  if (role?.startsWith("staff_")) return 1;
  return 0;
}

function getSections(role: UserRole | undefined, isDemo = false): NavSection[] {
  const level = roleLevel(role);
  return NAV_SECTIONS
    .filter((s) => {
      if (s.demoOnly && !isDemo) return false;
      if (isDemo && s.demoVisible) return true;
      if (!s.minRole) return true;
      if (s.minRole === "practice_admin") return level >= 2;
      if (s.minRole === "super_admin") return level >= 3;
      return false;
    })
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => {
        if (isDemo && !item.minRole) return true;
        if (!item.minRole) return true;
        if (item.minRole === "practice_admin") return level >= 2;
        if (item.minRole === "super_admin") return level >= 3;
        return false;
      }),
    }))
    .filter((s) => s.items.length > 0);
}

// ── Office picker ─────────────────────────────────────────────────────────────

function OfficePicker({ compact = false }: { compact?: boolean }) {
  const { offices, selectedOfficeId, setSelectedOfficeId, isLoading } = useOffice();
  const { isDemo } = useAuth();

  if (isLoading) return null;

  if (isDemo) return null;

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

// ── Sidebar inner content ─────────────────────────────────────────────────────

function SidebarContent({
  location,
  subtitleText,
  onNavClick,
}: {
  location: string;
  subtitleText: string;
  onNavClick?: () => void;
}) {
  const { user, profile, logout, isDemo } = useAuth();
  const sections = getSections(profile?.role, isDemo);

  const handleLogout = () => {
    onNavClick?.();
    logout();
  };

  return (
    <>
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
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

      {/* Nav sections */}
      <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "pt-4" : ""}>
            {section.label && (
              <p className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 select-none">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = !item.external && location === item.href;
              const Icon = item.icon;

              if (item.external) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onNavClick}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                    <ExternalLink className="w-3 h-3 ml-auto opacity-40 group-hover:opacity-70" />
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative",
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
                  <Icon className={cn("w-4 h-4 shrink-0 relative z-10", isActive ? "text-primary" : "")} />
                  <span className="relative z-10 text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="p-4 mt-auto border-t border-border shrink-0">
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

// ── Main Layout ───────────────────────────────────────────────────────────────

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
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={closeMobile}
            />
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 36, mass: 0.8 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden"
            >
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
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            You are viewing a demo — no real patient data is shown
            <button
              onClick={logout}
              className="ml-auto flex items-center gap-1 text-amber-700 hover:text-amber-900 transition-colors font-semibold"
            >
              <LogOut className="w-3 h-3" /> Exit demo
            </button>
          </div>
        )}

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8 lg:p-12 pb-24 md:pb-8">
          <motion.div
            key={location}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="max-w-6xl mx-auto w-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* ── Bottom tab bar — mobile only ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border flex items-stretch safe-area-bottom">
        {TAB_BAR_ITEMS.map((item) => {
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
                {item.label === "Referral Events" ? "Events" : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
