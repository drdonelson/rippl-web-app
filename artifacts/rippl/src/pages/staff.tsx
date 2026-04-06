import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import {
  Users, KeyRound, UserPlus, Lock, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Demo fake data ─────────────────────────────────────────────────────────────

interface DemoStaff {
  id: string;
  full_name: string;
  email: string;
  office_name: string;
  role_label: string;
}

const DEMO_STAFF: DemoStaff[] = [
  { id: "s1", full_name: "Sarah Johnson",   email: "frontdesk@brentwood.demo",  office_name: "Brentwood",   role_label: "Front Desk"     },
  { id: "s2", full_name: "Mike Williams",   email: "frontdesk@lewisburg.demo",  office_name: "Lewisburg",   role_label: "Front Desk"     },
  { id: "s3", full_name: "Lisa Chen",       email: "frontdesk@greenbrier.demo", office_name: "Greenbrier",  role_label: "Front Desk"     },
  { id: "s4", full_name: "Dr. Demo Admin",  email: "admin@demo.rippl",          office_name: "All Offices", role_label: "Practice Admin" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { isDemo, profile } = useAuth();
  const [, navigate] = useLocation();

  // Real admins don't need this page — send them to the full onboard page
  if (!isDemo && profile?.role === "super_admin") {
    navigate("/onboard");
    return null;
  }

  // Non-demo, non-admin users shouldn't see this at all
  if (!isDemo) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Staff Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage front desk and admin staff who can log referral events.
          </p>
        </div>

        {/* Add Staff — disabled in demo */}
        <button
          disabled
          title="Disabled in demo mode"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary/30 text-primary-foreground/50 rounded-xl font-semibold text-sm cursor-not-allowed opacity-60"
        >
          <Lock className="w-4 h-4" />
          <span className="hidden sm:inline">Add Staff</span>
        </button>
      </div>

      {/* Staff table card */}
      <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1.5fr_48px] gap-4 px-6 py-3 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
          <span>Name</span>
          <span>Email</span>
          <span>Office</span>
          <span>Role</span>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {DEMO_STAFF.map(acct => (
            <div
              key={acct.id}
              className="grid md:grid-cols-[2fr_2fr_1.5fr_1.5fr_48px] gap-4 px-6 py-4 text-sm items-center hover:bg-muted/10 transition-colors"
            >
              {/* Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {acct.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <span className="font-semibold text-foreground truncate">{acct.full_name}</span>
              </div>

              {/* Email */}
              <div className="text-muted-foreground text-xs truncate">{acct.email}</div>

              {/* Office */}
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                <span className="truncate">{acct.office_name}</span>
              </div>

              {/* Role */}
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                  {acct.role_label}
                </span>
              </div>

              {/* Actions — disabled in demo */}
              <div className="flex items-center justify-end">
                <button
                  disabled
                  title="Disabled in demo mode"
                  className="p-2 rounded-lg text-muted-foreground/30 cursor-not-allowed"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo notice */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/20 border border-border text-sm text-muted-foreground">
        <Lock className="w-4 h-4 shrink-0 text-primary/50" />
        This is a read-only demo view. Staff management is disabled in demo mode.
      </div>
    </div>
  );
}
