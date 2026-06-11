import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Printer, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ScoredAccount } from "@/lib/types";
import { formatCurrencyShort } from "@/lib/format";
import {
  getOrGenerateActionPlan,
  regenerateActionPlan,
  type GeneratedActionPlan,
} from "@/lib/actionPlan.functions";

export function ActionPlanModal({
  account,
  open,
  onOpenChange,
}: {
  account: ScoredAccount | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const getPlan = useServerFn(getOrGenerateActionPlan);
  const regenPlan = useServerFn(regenerateActionPlan);

  const query = useQuery({
    queryKey: ["action-plan", account?.id],
    queryFn: () => getPlan({ data: { accountId: account!.id } }),
    enabled: !!account && open,
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!account) return null;
  const plan = query.data?.plan;

  const handleRegenerate = async () => {
    try {
      const res = await regenPlan({ data: { accountId: account.id } });
      query.refetch();
      toast.success("Action plan regenerated");
      return res;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to regenerate");
    }
  };

  const plaintext = plan
    ? `Action Plan — ${account.accountName}

EXECUTIVE SUMMARY
${plan.executiveSummary}

RECOMMENDED PRODUCTS
${plan.products.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

TALKING POINTS
${plan.talkingPoints.map((t, i) => `${i + 1}. ${t}`).join("\n")}

OUTREACH TIMELINE
${plan.timeline.map((t) => `${t.week}: ${t.action}`).join("\n")}

ESTIMATED ROI
${plan.roiLow > 0 ? `${formatCurrencyShort(plan.roiLow)}–${formatCurrencyShort(plan.roiHigh)} · ${plan.roiPct}` : plan.roiPct}

OBJECTION HANDLING
${plan.objections.map((o) => `Q: ${o.objection}\nA: ${o.response}`).join("\n\n")}
`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Action Plan — {account.accountName}
          </DialogTitle>
        </DialogHeader>

        {query.isLoading && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
            <p className="text-sm text-muted-foreground">
              Generating AI-tailored action plan for {account.accountName}…
            </p>
          </div>
        )}

        {query.isError && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive">
              {query.error instanceof Error ? query.error.message : "Failed to generate plan."}
            </p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        )}

        {plan && (
          <>
            <div className="print-root space-y-5 text-sm">
              <Section title="📌 Executive Summary">
                <p className="text-foreground">{plan.executiveSummary}</p>
              </Section>
              <Section title="☁️ Recommended Products">
                <ul className="space-y-2">
                  {plan.products.map((p) => (
                    <li key={p.name}>
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-muted-foreground"> — {p.description}</span>
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="💬 Talking Points">
                <ul className="list-disc space-y-1 pl-5">
                  {plan.talkingPoints.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </Section>
              <Section title="📅 Outreach Timeline">
                <ol className="space-y-2">
                  {plan.timeline.map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: "var(--accent)", color: "var(--primary)" }}
                      >
                        {t.week}
                      </span>
                      <span>{t.action}</span>
                    </li>
                  ))}
                </ol>
              </Section>
              <Section title="💰 Estimated ROI">
                <p className="font-semibold" style={{ color: "var(--success)" }}>
                  {plan.roiLow > 0
                    ? `${formatCurrencyShort(plan.roiLow)} – ${formatCurrencyShort(plan.roiHigh)}`
                    : "—"}
                </p>
                <p className="text-muted-foreground">{plan.roiPct}</p>
              </Section>
              <Section title="🛡️ Objection Handling">
                <div className="space-y-3">
                  {plan.objections.map((o, i) => (
                    <div key={i} className="rounded-md border bg-background p-3">
                      <p className="font-medium italic">{o.objection}</p>
                      <p className="mt-1 text-muted-foreground">{o.response}</p>
                    </div>
                  ))}
                </div>
              </Section>
              {query.data?.cached && (
                <p className="text-xs text-muted-foreground">
                  Cached plan · click Regenerate for a fresh version.
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={handleRegenerate} disabled={query.isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(plaintext);
                  toast.success("📋 Action plan copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Plan
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
