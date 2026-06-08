import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ScoredAccount, ActionPlanStatus, Urgency } from "@/lib/types";
import { EmailModal } from "./EmailModal";
import { ActionPlanModal } from "./ActionPlanModal";
import { LogCallModal } from "./LogCallModal";
import { ImportAccountsModal } from "./ImportAccountsModal";
import { DeprioritizeModal } from "./DeprioritizeModal";
import { UrgencyModal } from "./UrgencyModal";
import { OutcomeModal } from "./OutcomeModal";
import { MAX_ACTIVE_PLANS, useApp } from "@/state/AppStore";

type ModalKind = "email" | "plan" | "call" | "deprioritize" | "urgency" | null;

interface ModalsCtx {
  openEmail: (a: ScoredAccount) => void;
  openPlan: (a: ScoredAccount) => void;
  openCall: (a: ScoredAccount) => void;
  openImport: () => void;
  openDeprioritize: (a: ScoredAccount) => void;
  startCreatePlan: (a: ScoredAccount) => void;
  openOutcome: (accountId: string, accountName: string, status: "won" | "lost") => void;
}

const Ctx = createContext<ModalsCtx | null>(null);

export function ModalsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { createPlan, setPlanStatus, activePlanCount, state } = useApp();
  const [kind, setKind] = useState<ModalKind>(null);
  const [account, setAccount] = useState<ScoredAccount | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [outcome, setOutcome] = useState<{ open: boolean; accountId: string; accountName: string; status: "won" | "lost" }>(
    { open: false, accountId: "", accountName: "", status: "won" },
  );

  const open = useCallback((k: ModalKind, a: ScoredAccount) => {
    setAccount(a);
    setKind(k);
  }, []);

  const startCreatePlan = useCallback(
    (a: ScoredAccount) => {
      const existing = state.actionPlans[a.id];
      if (existing && ["not_contacted", "contacted", "meeting_scheduled", "proposal_sent"].includes(existing.status)) {
        toast.info(`${a.accountName} already has an active plan.`);
        navigate({ to: "/action-plans/$accountId", params: { accountId: a.id } });
        return;
      }
      if (activePlanCount >= MAX_ACTIVE_PLANS) {
        toast.warning(`You have ${MAX_ACTIVE_PLANS} active plans. Please close one before adding a new account.`);
        return;
      }
      open("urgency", a);
    },
    [state.actionPlans, activePlanCount, navigate, open],
  );

  const handleUrgencyConfirm = (urgency: Urgency) => {
    if (!account) return;
    createPlan(account.id, urgency);
    const id = account.id;
    setKind(null);
    toast.success(`Action plan created for ${account.accountName}`);
    navigate({ to: "/action-plans/$accountId", params: { accountId: id } });
  };

  const handleOutcomeSubmit = (factor: string, status: ActionPlanStatus) => {
    setPlanStatus(outcome.accountId, status, factor);
    setOutcome((o) => ({ ...o, open: false }));
    toast.success(`Marked ${status.toUpperCase()} — deciding factor saved.`);
  };

  return (
    <Ctx.Provider
      value={{
        openEmail: (a) => open("email", a),
        openPlan: (a) => open("plan", a),
        openCall: (a) => open("call", a),
        openImport: () => setImportOpen(true),
        openDeprioritize: (a) => open("deprioritize", a),
        startCreatePlan,
        openOutcome: (accountId, accountName, status) =>
          setOutcome({ open: true, accountId, accountName, status }),
      }}
    >
      {children}
      <EmailModal account={account} open={kind === "email"} onOpenChange={(o) => !o && setKind(null)} />
      <ActionPlanModal account={account} open={kind === "plan"} onOpenChange={(o) => !o && setKind(null)} />
      <LogCallModal account={account} open={kind === "call"} onOpenChange={(o) => !o && setKind(null)} />
      <ImportAccountsModal open={importOpen} onOpenChange={setImportOpen} />
      <DeprioritizeModal account={account} open={kind === "deprioritize"} onOpenChange={(o) => !o && setKind(null)} />
      <UrgencyModal
        account={account}
        open={kind === "urgency"}
        onOpenChange={(o) => !o && setKind(null)}
        onConfirm={handleUrgencyConfirm}
      />
      <OutcomeModal
        open={outcome.open}
        onOpenChange={(o) => setOutcome((s) => ({ ...s, open: o }))}
        status={outcome.status}
        accountName={outcome.accountName}
        onSubmit={handleOutcomeSubmit}
      />
    </Ctx.Provider>
  );
}

export function useModals() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useModals must be inside ModalsProvider");
  return v;
}
