import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface TeamContextValue {
  teamId: string | null;
  setTeamId: (id: string | null) => void;
}

const TeamContext = createContext<TeamContextValue | null>(null);

const STORAGE_KEY = "desboard-selected-team-id";

export function TeamProvider({ children }: { children: ReactNode }) {
  const [teamId, setTeamIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setTeamId = useCallback((id: string | null) => {
    setTeamIdState(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <TeamContext.Provider value={{ teamId, setTeamId }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamContext() {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error("useTeamContext must be used within TeamProvider");
  }
  return ctx;
}
