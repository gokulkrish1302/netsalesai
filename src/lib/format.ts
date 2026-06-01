export function formatCurrencyShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

export function formatDays(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

export function formatDate(d: string | Date | null): string {
  if (!d) return "Never";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const STAGE_LABEL: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  meeting_scheduled: "Meeting Scheduled",
  proposal_sent: "Proposal Sent",
  closed: "Closed",
};

export const STAGE_ORDER = [
  "not_contacted",
  "contacted",
  "meeting_scheduled",
  "proposal_sent",
  "closed",
] as const;
