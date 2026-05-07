import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export type StaffRole = "staff_brentwood" | "staff_lewisburg" | "staff_greenbrier";
export type UserRole = "super_admin" | "practice_admin" | "demo" | StaffRole;

export function staffOfficeLabel(role: UserRole): string | null {
  if (!role.startsWith("staff_")) return null;
  const loc = role.replace("staff_", "");
  return `${loc.charAt(0).toUpperCase() + loc.slice(1)} Staff`;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  practice_id: string | null;
  full_name: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isDemo: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  loginAsDemo: () => Promise<{ error: string | null }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isDemo: false,
  isStaff: false,
  login: async () => ({ error: null }),
  loginAsDemo: async () => ({ error: null }),
  logout: () => {},
});

async function fetchProfile(userId: string, accessToken?: string): Promise<UserProfile | null> {
  try {
    const headers: Record<string, string> = { "x-user-id": userId };
    if (accessToken) headers["authorization"] = `Bearer ${accessToken}`;
    const res = await fetch(`${BASE}/api/auth/profile`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Register the token getter at MODULE LOAD TIME ────────────────────────────
// This runs before any component renders, which means even components that
// fire API calls during their very first render will have a valid token getter.
// Without this, useEffect (which runs post-render) would be too late, causing
// the first batch of requests to fire with no Authorization header → 401.
setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (sess: Session | null) => {
    if (!sess?.user) {
      setProfile(null);
      return;
    }
    const p = await fetchProfile(sess.user.id, sess.access_token);
    setProfile(p);
  }, []);

  useEffect(() => {
    let nullSessionTimer: ReturnType<typeof setTimeout> | null = null;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session).finally(() => setIsLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess) {
        // Valid session — apply immediately
        if (nullSessionTimer) { clearTimeout(nullSessionTimer); nullSessionTimer = null; }
        setSession(sess);
        loadProfile(sess);
      } else {
        // Null session — debounce 500ms to survive SIGNED_OUT → SIGNED_IN transitions
        nullSessionTimer = setTimeout(() => {
          setSession(null);
          loadProfile(null);
        }, 500);
      }
    });

    return () => {
      if (nullSessionTimer) clearTimeout(nullSessionTimer);
      subscription.unsubscribe();
      setAuthTokenGetter(null);
    };
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const loginAsDemo = useCallback(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@joinrippl.com",
      password: "RipplDemo2026!",
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const logout = useCallback(() => {
    setProfile(null);
    void supabase.auth.signOut();
  }, []);

  const isDemo = profile?.role === "demo";
  const isStaff = (profile?.role ?? "").startsWith("staff_");

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isDemo,
      isStaff,
      login,
      loginAsDemo,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
