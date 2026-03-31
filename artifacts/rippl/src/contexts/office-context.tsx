import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Office {
  id: string;
  name: string;
  location: string;
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
  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOfficeId, setSelectedOfficeIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "all";
  });

  useEffect(() => {
    fetch(`${BASE}/api/offices`)
      .then(r => r.json())
      .then((data: Office[]) => setOffices(data))
      .catch(() => setOffices([]))
      .finally(() => setIsLoading(false));
  }, []);

  const setSelectedOfficeId = useCallback((id: string) => {
    setSelectedOfficeIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

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
