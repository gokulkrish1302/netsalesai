import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sun, RefreshCw, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateMorningBriefing } from "@/lib/briefing.functions";
import { useApp } from "@/state/AppStore";
import { useAuth } from "@/state/AuthContext";

const DISMISS_KEY = "briefing-dismissed-date";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function MorningBriefing() {
  const { scoredAccounts, state } = useApp();
  const { rep, user } = useAuth();
  const generate = useServerFn(generateMorningBriefing);

  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === todayKey();
  });
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ changeCount: number; generatedAt: string } | null>(null);

  async function run() {
    if (!user || scoredAccounts.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const payload = scoredAccounts.map((a) => ({
        id: a.id,
        accountName: a.accountName,
        salesRep: a.salesRep,
        score: a.score,
        category: a.category,
        utilizationPct: a.utilizationPct,
        contractRenewalDays: a.contractRenewalDays,
        riskCountHigh: a.riskCountHigh ?? 0,
        pipelineStage: state.pipelineStages[a.id] ?? a.pipelineStage,
        lastContactDate: a.lastContactDate,
        inActionPlan: !!state.actionPlans[a.id],
      }));
      const res = await generate({
        data: {
          accounts: payload,
          repName: rep?.name ?? user.email?.split("@")[0],
        },
      });
      setText(res.text);
      setMeta({ changeCount: res.changeCount, generatedAt: res.generatedAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  }

  // Auto-run once per session/day when accounts are ready
  useEffect(() => {
    if (dismissed || text || loading) return;
    if (!user || scoredAccounts.length === 0) return;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, scoredAccounts.length]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, todayKey());
    setDismissed(true);
  }

  if (dismissed) return null;

  const firstName =
    (rep?.name || user?.email?.split("@")[0] || "there").split(/[\s.]+/)[0].replace(/^./, (c) => c.toUpperCase());

  return (
    <Card className="overflow-hidden border-[color:var(--border)]/60">
      <div
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--primary) 10%, transparent), transparent)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in oklab, var(--primary) 18%, transparent)" }}
          >
            <Sun className="h-4 w-4" style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">Good morning, {firstName}</div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {loading
                ? "NetAIChat is reading your book…"
                : meta
                  ? `${meta.changeCount} change${meta.changeCount === 1 ? "" : "s"} detected since last visit`
                  : "AI-generated morning briefing"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={run}
            disabled={loading}
            className="h-8 gap-1.5 px-2 text-xs"
            aria-label="Refresh briefing"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((v) => !v)}
            className="h-8 w-8 p-0"
            aria-label={collapsed ? "Expand briefing" : "Collapse briefing"}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            className="h-8 w-8 p-0"
            aria-label="Dismiss briefing"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!collapsed && (
        <div className="px-5 py-4">
          {loading && !text && (
            <div className="space-y-2">
              <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-muted animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {error}. <button onClick={run} className="underline">Try again</button>
            </p>
          )}
          {text && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {text}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
