import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/state/AppStore";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";
import type { Weights } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { ScorePill } from "@/components/common/ScoreBadge";
import { useAuth } from "@/state/AuthContext";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sliders, BarChart3, Users } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NetApp Cloud Migration Agent" },
      { name: "description", content: "Customize scoring weights to match your sales territory priorities." },
    ],
  }),
  component: SettingsPage,
});

const FIELDS: { key: keyof Weights; label: string; description: string }[] = [
  { key: "deviceAge", label: "Device Age", description: "Older infrastructure signals replacement urgency." },
  { key: "utilization", label: "Storage Utilization", description: "High utilization signals capacity expansion needs." },
  { key: "budget", label: "IT Budget", description: "Larger budgets indicate deal size and purchasing power." },
  { key: "cloud", label: "Cloud Readiness", description: "Existing cloud adoption accelerates NetApp expansion." },
  { key: "industry", label: "Industry Fit", description: "Verticals with strong cloud adoption patterns." },
  { key: "renewal", label: "Renewal Urgency", description: "Days until contract renewal — the natural decision point." },
];

function SettingsPage() {
  const { state, setWeights, resetWeights, scoredAccounts, previousScoredAccounts } = useApp();
  const { isAdmin } = useAuth();
  const toastDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: keyof Weights, newValue: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(newValue)));
    const current = state.weights;
    const others = (Object.keys(current) as (keyof Weights)[]).filter((k) => k !== key);
    const remaining = 100 - clamped;
    const otherSum = others.reduce((s, k) => s + current[k], 0);

    const next: Weights = { ...current, [key]: clamped };
    if (otherSum === 0) {
      const each = Math.floor(remaining / others.length);
      others.forEach((k) => (next[k] = each));
      next[others[0]] += remaining - each * others.length;
    } else {
      let allocated = 0;
      others.forEach((k, i) => {
        if (i === others.length - 1) {
          next[k] = remaining - allocated;
        } else {
          const share = Math.round((current[k] / otherSum) * remaining);
          next[k] = share;
          allocated += share;
        }
      });
    }
    setWeights(next);

    if (toastDebounceRef.current) clearTimeout(toastDebounceRef.current);
    toastDebounceRef.current = setTimeout(() => {
      toast.success("📊 Weights updated — scores recalculated");
    }, 400);
  }

  const top5Now = useMemo(
    () => [...scoredAccounts].sort((a, b) => b.score - a.score).slice(0, 5),
    [scoredAccounts],
  );
  const top5Before = useMemo(
    () => [...previousScoredAccounts].sort((a, b) => b.score - a.score).slice(0, 5),
    [previousScoredAccounts],
  );

  const total = Object.values(state.weights).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your scoring weights, preview impact{isAdmin ? ", and administer your team" : ""}.
        </p>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["weights"]}
        className="space-y-3"
      >
        <AccordionItem
          value="weights"
          className="app-card border-0 px-5"
        >
          <AccordionTrigger className="py-4 hover:no-underline">
            <SectionHeader
              icon={<Sliders className="h-4 w-4" />}
              title="Scoring weights"
              description="Tune how much each signal contributes to an account's score."
            />
          </AccordionTrigger>
          <AccordionContent className="pb-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Total: <span className="font-semibold text-foreground tabular-nums">{total}</span> / 100
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetWeights();
                  toast.success("Weights reset to default");
                }}
              >
                Reset to Default
              </Button>
            </div>
            <div className="space-y-6">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {f.label} — <span style={{ color: "var(--primary)" }}>{state.weights[f.key]}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground">
                      Default: {DEFAULT_WEIGHTS[f.key]}%
                    </div>
                  </div>
                  <Slider
                    value={[state.weights[f.key]]}
                    min={0}
                    max={60}
                    step={1}
                    onValueChange={(v) => update(f.key, v[0])}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preview" className="app-card border-0 px-5">
          <AccordionTrigger className="py-4 hover:no-underline">
            <SectionHeader
              icon={<BarChart3 className="h-4 w-4" />}
              title="Top 5 impact preview"
              description="See how your weight changes shift the leaderboard."
            />
          </AccordionTrigger>
          <AccordionContent className="pb-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Top5Card title="Before" items={top5Before} />
              <Top5Card title="After" items={top5Now} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {isAdmin && (
          <AccordionItem value="team" className="app-card border-0 px-5">
            <AccordionTrigger className="py-4 hover:no-underline">
              <SectionHeader
                icon={<Users className="h-4 w-4" />}
                title="Team management"
                description="Add, remove, and grant admin access to sales reps."
                badge="Admin"
              />
            </AccordionTrigger>
            <AccordionContent className="pb-5">
              <TeamManagement />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 text-left">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)", color: "var(--primary)" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs font-normal text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Top5Card({
  title,
  items,
}: {
  title: string;
  items: { id: string; accountName: string; score: number; category: import("@/lib/types").Category }[];
}) {
  return (
    <div className="rounded-xl border bg-background/40 p-5">
      <h3 className="mb-3 text-sm font-semibold">Top 5 — {title}</h3>
      <ol className="space-y-2">
        {items.map((a, i) => (
          <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 text-right text-xs font-bold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="font-medium">{a.accountName}</span>
            </div>
            <ScorePill score={a.score} category={a.category} />
          </li>
        ))}
      </ol>
    </div>
  );
}
