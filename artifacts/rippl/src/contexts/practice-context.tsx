import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Practice {
  id: string;
  name: string;
  slug: string;
  vertical: string | null;
  status: string;
}

interface PracticeContextValue {
  practices: Practice[];
  selectedPracticeId: string | null;
  setSelectedPracticeId: (id: string | null) => void;
  selectedPractice: Practice | null;
  isLoading: boolean;
}

const PracticeContext = createContext<PracticeContextValue>({
  practices: [],
  selectedPracticeId: null,
  setSelectedPracticeId: () => {},
  selectedPractice: null,
  isLoading: false,
});

const STORAGE_KEY = "rippl_selected_practice_id";

export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const { profile, isLoading: authLoading } = useAuth();
  const isSuperAdmin = profile?.role === "super_admin";
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPracticeId, setSelectedPracticeIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? null;
  });

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
    <PracticeContext.Provider value={{ practices, selectedPracticeId, setSelectedPracticeId, selectedPractice, isLoading }}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePractice() {
  return useContext(PracticeContext);
}
