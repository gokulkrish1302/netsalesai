import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { MOCK_ACCOUNTS } from "@/lib/mockAccounts";
import { DEFAULT_WEIGHTS, scoreAll } from "@/lib/scoring";
import type { Account, CallLog, Category, PipelineStage, ScoredAccount, StageHistoryEntry, Weights } from "@/lib/types";

interface DeprioritizeEntry {
  category: Category;
  reason: string;
  previousCategory: Category;
  rationale: string;
  at: string;
}

interface AppState {
  weights: Weights;
  pipelineStages: Record<string, PipelineStage>;
  stageHistory: Record<string, StageHistoryEntry[]>;
  notes: Record<string, { id: string; text: string; createdAt: string }[]>;
  callLogs: Record<string, CallLog[]>;
  importedAccounts: Account[];
  deprioritized: Record<string, DeprioritizeEntry>;
  activeAccountId: string | null;
}

type Action =
  | { type: "SET_WEIGHTS"; weights: Weights }
  | { type: "RESET_WEIGHTS" }
  | { type: "SET_STAGE"; accountId: string; stage: PipelineStage }
  | { type: "ADD_NOTE"; accountId: string; text: string }
  | { type: "ADD_CALL_LOG"; log: CallLog }
  | { type: "ADD_IMPORTED"; accounts: Account[] }
  | { type: "REMOVE_IMPORTED"; id: string }
  | { type: "DEPRIORITIZE"; accountId: string; entry: DeprioritizeEntry }
  | { type: "UNDO_DEPRIORITIZE"; accountId: string }
  | { type: "OPEN_ACCOUNT"; accountId: string | null };

const LS_KEY = "netapp-cma-state-v3";
const LS_LEGACY_KEYS = ["netapp-cma-state-v2", "netapp-cma-state-v1"];

function loadPersisted(): Partial<AppState> {
  if (typeof window === "undefined") return {};
  try {
    let raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      for (const k of LS_LEGACY_KEYS) {
        raw = localStorage.getItem(k);
        if (raw) break;
      }
    }
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function initial(): AppState {
  const persisted = loadPersisted();
  const pipelineStages: Record<string, PipelineStage> = { ...persisted.pipelineStages };
  const imported = persisted.importedAccounts ?? [];
  for (const a of [...MOCK_ACCOUNTS, ...imported]) {
    if (!pipelineStages[a.id]) pipelineStages[a.id] = a.pipelineStage;
  }
  return {
    weights: persisted.weights ?? DEFAULT_WEIGHTS,
    pipelineStages,
    stageHistory: persisted.stageHistory ?? {},
    notes: persisted.notes ?? {},
    callLogs: persisted.callLogs ?? {},
    importedAccounts: imported,
    deprioritized: persisted.deprioritized ?? {},
    activeAccountId: null,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_WEIGHTS":
      return { ...state, weights: action.weights };
    case "RESET_WEIGHTS":
      return { ...state, weights: DEFAULT_WEIGHTS };
    case "SET_STAGE": {
      const now = new Date().toISOString();
      const history = state.stageHistory[action.accountId] ?? [];
      return {
        ...state,
        pipelineStages: { ...state.pipelineStages, [action.accountId]: action.stage },
        stageHistory: {
          ...state.stageHistory,
          [action.accountId]: [...history, { stage: action.stage, date: now }],
        },
      };
    }
    case "ADD_NOTE": {
      const now = new Date().toISOString();
      const existing = state.notes[action.accountId] ?? [];
      return {
        ...state,
        notes: {
          ...state.notes,
          [action.accountId]: [
            { id: `note-${Date.now()}`, text: action.text, createdAt: now },
            ...existing,
          ],
        },
      };
    }
    case "ADD_CALL_LOG": {
      const existing = state.callLogs[action.log.accountId] ?? [];
      return {
        ...state,
        callLogs: {
          ...state.callLogs,
          [action.log.accountId]: [action.log, ...existing],
        },
      };
    }
    case "ADD_IMPORTED": {
      const nextStages = { ...state.pipelineStages };
      for (const a of action.accounts) {
        if (!nextStages[a.id]) nextStages[a.id] = a.pipelineStage;
      }
      return {
        ...state,
        importedAccounts: [...action.accounts, ...state.importedAccounts],
        pipelineStages: nextStages,
      };
    }
    case "REMOVE_IMPORTED": {
      return {
        ...state,
        importedAccounts: state.importedAccounts.filter((a) => a.id !== action.id),
      };
    }
    case "DEPRIORITIZE":
      return {
        ...state,
        deprioritized: { ...state.deprioritized, [action.accountId]: action.entry },
      };
    case "UNDO_DEPRIORITIZE": {
      const next = { ...state.deprioritized };
      delete next[action.accountId];
      return { ...state, deprioritized: next };
    }
    case "OPEN_ACCOUNT":
      return { ...state, activeAccountId: action.accountId };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  scoredAccounts: ScoredAccount[];
  previousScoredAccounts: ScoredAccount[];
  activeAccount: ScoredAccount | null;
  setWeights: (w: Weights) => void;
  resetWeights: () => void;
  setStage: (accountId: string, stage: PipelineStage) => void;
  addNote: (accountId: string, text: string) => void;
  addCallLog: (log: CallLog) => void;
  addImportedAccounts: (accounts: Account[]) => void;
  removeImportedAccount: (id: string) => void;
  deprioritize: (accountId: string, entry: DeprioritizeEntry) => void;
  undoDeprioritize: (accountId: string) => void;
  openAccount: (accountId: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// Deterministic "synced X minutes ago" timestamp for mock accounts based on id
function mockSyncedAt(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const minutesAgo = (h % 240) + 5; // 5–245 minutes
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const [previousWeights, setPreviousWeights] = useState<Weights>(state.weights);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot = {
      weights: state.weights,
      pipelineStages: state.pipelineStages,
      stageHistory: state.stageHistory,
      notes: state.notes,
      callLogs: state.callLogs,
      importedAccounts: state.importedAccounts,
      deprioritized: state.deprioritized,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
  }, [
    state.weights,
    state.pipelineStages,
    state.stageHistory,
    state.notes,
    state.callLogs,
    state.importedAccounts,
    state.deprioritized,
  ]);

  const accountsWithStages: Account[] = useMemo(
    () =>
      [...MOCK_ACCOUNTS, ...state.importedAccounts].map((a) => ({
        ...a,
        pipelineStage: state.pipelineStages[a.id] ?? a.pipelineStage,
        dataSource: a.dataSource ?? "active_iq",
        sourceTimestamp: a.sourceTimestamp ?? mockSyncedAt(a.id),
      })),
    [state.pipelineStages, state.importedAccounts],
  );

  const previousScoredAccounts = useMemo(
    () => scoreAll(accountsWithStages, previousWeights),
    [accountsWithStages, previousWeights],
  );

  const scoredAccounts = useMemo(() => {
    const base = scoreAll(
      accountsWithStages,
      state.weights,
      Object.fromEntries(previousScoredAccounts.map((p) => [p.id, p.score])),
    );
    // Apply deprioritize category overrides
    return base.map((a) => {
      const dp = state.deprioritized[a.id];
      return dp ? { ...a, category: dp.category } : a;
    });
  }, [accountsWithStages, state.weights, previousScoredAccounts, state.deprioritized]);

  const activeAccount = useMemo(
    () => scoredAccounts.find((a) => a.id === state.activeAccountId) ?? null,
    [scoredAccounts, state.activeAccountId],
  );

  const setWeights = useCallback((w: Weights) => {
    setPreviousWeights((prev) => prev);
    dispatch({ type: "SET_WEIGHTS", weights: w });
  }, []);
  const resetWeights = useCallback(() => dispatch({ type: "RESET_WEIGHTS" }), []);
  const setStage = useCallback(
    (accountId: string, stage: PipelineStage) => dispatch({ type: "SET_STAGE", accountId, stage }),
    [],
  );
  const addNote = useCallback(
    (accountId: string, text: string) => dispatch({ type: "ADD_NOTE", accountId, text }),
    [],
  );
  const addCallLog = useCallback((log: CallLog) => dispatch({ type: "ADD_CALL_LOG", log }), []);
  const addImportedAccounts = useCallback(
    (accounts: Account[]) => dispatch({ type: "ADD_IMPORTED", accounts }),
    [],
  );
  const removeImportedAccount = useCallback(
    (id: string) => dispatch({ type: "REMOVE_IMPORTED", id }),
    [],
  );
  const deprioritize = useCallback(
    (accountId: string, entry: DeprioritizeEntry) =>
      dispatch({ type: "DEPRIORITIZE", accountId, entry }),
    [],
  );
  const undoDeprioritize = useCallback(
    (accountId: string) => dispatch({ type: "UNDO_DEPRIORITIZE", accountId }),
    [],
  );
  const openAccount = useCallback(
    (accountId: string | null) => dispatch({ type: "OPEN_ACCOUNT", accountId }),
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => setPreviousWeights(state.weights), 4000);
    return () => clearTimeout(timer);
  }, [state.weights]);

  const value: AppContextValue = {
    state,
    scoredAccounts,
    previousScoredAccounts,
    activeAccount,
    setWeights,
    resetWeights,
    setStage,
    addNote,
    addCallLog,
    addImportedAccounts,
    removeImportedAccount,
    deprioritize,
    undoDeprioritize,
    openAccount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
