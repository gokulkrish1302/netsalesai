import { createContext, useContext, useState, type ReactNode } from "react";
import type { ScoredAccount } from "@/lib/types";
import { EmailModal } from "./EmailModal";
import { ActionPlanModal } from "./ActionPlanModal";
import { LogCallModal } from "./LogCallModal";
import { ImportAccountsModal } from "./ImportAccountsModal";

type ModalKind = "email" | "plan" | "call" | null;

interface ModalsCtx {
  openEmail: (a: ScoredAccount) => void;
  openPlan: (a: ScoredAccount) => void;
  openCall: (a: ScoredAccount) => void;
  openImport: () => void;
}

const Ctx = createContext<ModalsCtx | null>(null);

export function ModalsProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<ModalKind>(null);
  const [account, setAccount] = useState<ScoredAccount | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  function open(k: ModalKind, a: ScoredAccount) {
    setAccount(a);
    setKind(k);
  }

  return (
    <Ctx.Provider
      value={{
        openEmail: (a) => open("email", a),
        openPlan: (a) => open("plan", a),
        openCall: (a) => open("call", a),
        openImport: () => setImportOpen(true),
      }}
    >
      {children}
      <EmailModal account={account} open={kind === "email"} onOpenChange={(o) => !o && setKind(null)} />
      <ActionPlanModal account={account} open={kind === "plan"} onOpenChange={(o) => !o && setKind(null)} />
      <LogCallModal account={account} open={kind === "call"} onOpenChange={(o) => !o && setKind(null)} />
      <ImportAccountsModal open={importOpen} onOpenChange={setImportOpen} />
    </Ctx.Provider>
  );
}

export function useModals() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useModals must be inside ModalsProvider");
  return v;
}
