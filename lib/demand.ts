import type { DemandIssue } from "@/lib/types";

export interface DemandTotals {
  proposed: number;
  accepted: number;
  dropped: number;
  disputed: number;
}

export function computeDemandTotals(issues: DemandIssue[]): DemandTotals {
  const t = issues.reduce(
    (acc, iss) => {
      acc.proposed += iss.tax_demanded + iss.interest_demanded + iss.penalty_demanded;
      acc.accepted += iss.tax_acceptable + iss.interest_acceptable + iss.penalty_acceptable;
      acc.dropped += (iss.tax_dropped ?? 0) + (iss.interest_dropped ?? 0) + (iss.penalty_dropped ?? 0);
      return acc;
    },
    { proposed: 0, accepted: 0, dropped: 0 }
  );
  return { ...t, disputed: t.proposed - t.accepted - t.dropped };
}

export function fmtInr(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
