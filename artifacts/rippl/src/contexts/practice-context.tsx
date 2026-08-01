import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Practice {
  id: string;
  name: string;
  slug: string;
  vertical: string | null;
  status?: string;
}

interface PracticeContextValue {
  practices: Practice[];
  selectedPracticeId: string | null;
  setSelectedPracticeId: (id: string | null) => void;
  selectedPractice: Practice | null;
  /** The practice for the logged-in user — for practice_admin this is their own practice */
  myPractice: Practice | null;
  isLoading: boolean;
}

const PracticeContext = createContext<PracticeContextValue>({
  practices: [],
  selectedPracticeId: null,
  setSelectedPracticeId: () => {},
  selectedPractice: null,
  myPractice: null,
  isLoading: false,
});

const STORAGE_KEY = "rippl_selected_practice_id";

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const { profile, session, isLoading: authLoading } = useAuth();
  const isSuperAdmin = profile?.role === "super_admin";
  const isPracticeAdmin = profile?.role === "practice_admin";
  const [practices, setPractices] = useState<Practice[]>([]);
  const [myPractice, setMyPractice] = useState<Practice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPracticeId, setSelectedPracticeIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? null;
  });

  // super_admin: load all practices for the practice picker
  useEffect(() => {
    if (authLoading || !isSuperAdmin) return;

    setIsLoading(true);
    fetch(`${BASE}/api/practices`)
      .then(r => r.json())
      .then((data: unknown) => {
        const list = Array.isArray(data)
          ? (data as Practice[]).filter(p => p.status !== "demo")
          : [];
        setPractices(list);
      })
      .catch(() => setPractices([]))
      .finally(() => setIsLoading(false));
  }, [authLoading, isSuperAdmin]);

  // practice_admin (and any role with a practice_id): load own practice for vertical-aware pages
  useEffect(() => {
    if (authLoading || !profile?.practice_id || !session?.access_token) return;

    fetch(`${BASE}/api/practices/mine`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: unknown) => {
        if (data && typeof data === "object") setMyPractice(data as Practice);
      })
      .catch(() => {});
  }, [authLoading, profile?.practice_id, session?.access_token]);

  // For super_admin, also set myPractice from the selected practice
  useEffect(() => {
    if (isSuperAdmin && practices.length > 0 && selectedPracticeId) {
      const found = practices.find(p => p.id === selectedPracticeId) ?? null;
      if (found) setMyPractice(found);
    }
  }, [isSuperAdmin, practices, selectedPracticeId]);

  const setSelectedPracticeId = (id: string | null) => {
    setSelectedPracticeIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const selectedPractice = practices.find(p => p.id === selectedPracticeId) ?? null;

  return (
    <PracticeContext.Provider value={{ practices, selectedPracticeId, setSelectedPracticeId, selectedPractice, myPractice, isLoading }}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePractice() {
  return useContext(PracticeContext);
}
