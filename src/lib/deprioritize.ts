import type { Category } from "./types";

export interface DeprioritizeSuggestion {
  category: Category;
  rationale: string;
}

/**
 * Lightweight on-device "AI" classifier that reads the rep's reason and
 * suggests a new category. Heuristic + intent matching — fast, deterministic,
 * and offline. Returns category + a short rationale shown back to the user.
 */
export function suggestDeprioritization(reason: string): DeprioritizeSuggestion {
  const r = reason.trim().toLowerCase();

  if (!r) {
    return { category: "COLD", rationale: "No reason provided — defaulting to COLD." };
  }

  if (
    /\b(lost|won by|competitor|chose|switched|migrated to|going with|aws won|azure won|gcp won|dell|pure|hpe)\b/.test(r) ||
    /\b(not interested|do not contact|removed|opt[- ]?out)\b/.test(r)
  ) {
    return {
      category: "NOT_READY",
      rationale: "Detected loss/competitor signals — moved to NOT READY.",
    };
  }

  if (
    /\b(signed|renewed|just (signed|renewed|bought))\b/.test(r) ||
    /\b(\d+[\s-]?year|multi[- ]?year|long[- ]?term)\b/.test(r) ||
    /\b(locked in|committed|under contract)\b/.test(r)
  ) {
    return {
      category: "COLD",
      rationale: "Long-term commitment detected — revisit at next refresh cycle.",
    };
  }

  if (
    /\b(no budget|out of budget|next (year|quarter|fy|fiscal))\b/.test(r) ||
    /\b(delayed?|postponed?|push(ed)? back|later|q[1-4] next)\b/.test(r) ||
    /\b(re[- ]?evaluating|reassessing|on hold)\b/.test(r)
  ) {
    return {
      category: "WARM",
      rationale: "Timing/budget delay — keep warm for next cycle.",
    };
  }

  if (/\b(new (cio|cto|exec|leader)|reorg|acquisition|merger|leadership)\b/.test(r)) {
    return {
      category: "WARM",
      rationale: "Organizational change — re-engage once dust settles.",
    };
  }

  return {
    category: "COLD",
    rationale: "General deprioritization — moved to COLD for nurture cadence.",
  };
}
