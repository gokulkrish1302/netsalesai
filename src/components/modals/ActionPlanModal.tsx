import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import type { ScoredAccount } from "@/lib/types";
import { buildActionPlan } from "@/lib/actionPlans";
import { formatCurrencyShort } from "@/lib/format";

export function ActionPlanModal({
  account,
  open,
  onOpenChange,
}: {
  account: ScoredAccount | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!account) return null;
  const plan = buildActionPlan(account);

  const plaintext = `Action Plan — ${account.accountName}

EXECUTIVE SUMMARY
${plan.executiveSummary}

RECOMMENDED PRODUCTS
${plan.products.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

TOP 3 TALKING POINTS
${plan.talkingPoints.map((t, i) => `${i + 1}. ${t}`).join("\n")}

OUTREACH TIMELINE
${plan.timeline.map((t) => `${t.week}: ${t.action}`).join("\n")}

ESTIMATED ROI
${plan.roiLow > 0 ? `${formatCurrencyShort(plan.roiLow)}–${formatCurrencyShort(plan.roiHigh)} · ${plan.roiPct}` : plan.roiPct}

OBJECTION HANDLING
${plan.objections.map((o) => `Q: ${o.objection}\nA: ${o.response}`).join("\n\n")}
`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Action Plan — {account.accountName}</DialogTitle>
        </DialogHeader>
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
          <Section title="💬 Top 3 Talking Points">
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
        </div>
        <div className="flex flex-wrap justify-end gap-2">
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
