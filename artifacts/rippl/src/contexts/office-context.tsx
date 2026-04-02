import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { DEMO_OFFICE } from "@/lib/demo-data";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Office {
  id: string;
  name: string;
  location_code: string;
  active: boolean;
}

interface OfficeContextValue {
  offices: Office[];
  selectedOfficeId: string; // "all" or an office id
  selectedOffice: Office | null;
  setSelectedOfficeId: (id: string) => void;
  isLoading: boolean;
}

const OfficeContext = createContext<OfficeContextValue>({
  offices: [],
  selectedOfficeId: "all",
  selectedOffice: null,
  setSelectedOfficeId: () => {},
  isLoading: true,
});

const STORAGE_KEY = "rippl_selected_office_id";

export function OfficeProvider({ children }: { children: React.ReactNode }) {
  const { profile, isLoading: authLoading, isDemo } = useAuth();
  const [allOffices, setAllOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfficeId, setSelectedOfficeIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "all";
  });

  useEffect(() => {
    // Demo users always use the hardcoded demo office — skip API call
    if (!authLoading && isDemo) {
      setAllOffices([DEMO_OFFICE]);
      setSelectedOfficeIdState(DEMO_OFFICE.id);
      localStorage.setItem(STORAGE_KEY, DEMO_OFFICE.id);
      setIsLoading(false);
      return;
    }

    if (authLoading) return;

    fetch(`${BASE}/api/offices`)
      .then(r => r.json())
      .then((data: unknown) => setAllOffices(Array.isArray(data) ? data as Office[] : []))
      .catch(() => setAllOffices([]))
      .finally(() => setIsLoading(false));
  }, [authLoading, isDemo]);

  // Filter offices based on the logged-in user's role
  const offices: Office[] = React.useMemo(() => {
    if (isDemo) return [DEMO_OFFICE];
    if (authLoading || !profile) return allOffices;
    if (profile.role === "super_admin") return allOffices;
    // practice_admin — restrict to their assigned office only
    if (profile.practice_id) {
      return allOffices.filter(o => o.id === profile.practice_id);
    }
    return allOffices;
  }, [allOffices, profile, authLoading, isDemo]);

  // When the filtered office list resolves to exactly one office, auto-select it
  useEffect(() => {
    if (offices.length === 1) {
      const onlyId = offices[0].id;
      setSelectedOfficeIdState(onlyId);
      localStorage.setItem(STORAGE_KEY, onlyId);
    }
  }, [offices]);

  const setSelectedOfficeId = useCallback((id: string) => {
    // Demo users cannot switch offices
    if (isDemo) return;
    setSelectedOfficeIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, [isDemo]);

  const selectedOffice = offices.find(o => o.id === selectedOfficeId) ?? null;

  return (
    <OfficeContext.Provider
      value={{ offices, selectedOfficeId, selectedOffice, setSelectedOfficeId, isLoading }}
    >
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice() {
  return useContext(OfficeContext);
}
