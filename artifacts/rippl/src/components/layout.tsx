import React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { LayoutDashboard, CalendarDays, Users, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Referral Events", icon: CalendarDays },
  { href: "/patients", label: "Patients & QR", icon: Users },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card/30 backdrop-blur-xl flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Droplets className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground leading-none">Rippl</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Hallmark Dental</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 z-0">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
