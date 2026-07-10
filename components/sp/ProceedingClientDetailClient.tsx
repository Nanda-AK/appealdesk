"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MultiSelect, type NamedRecord } from "@/components/ui/MultiSelect";
import { fmtInr } from "@/lib/demand";
import ProceedingsSummaryTable, { type SummaryByCategory } from "@/components/sp/ProceedingsSummaryTable";

interface CaseAppeal {
  id: string;
  status: string | null;
  litigation_type: { id: string; name: string } | null;
  act_regulation: { id: string; name: string } | null;
  financial_year: { id: string; name: string } | null;
}

interface CaseProceeding {
  id: string;
  status: string | null;
  jurisdiction: string | null;
  jurisdiction_city: string | null;
  to_be_completed_by: string | null;
  proceeding_type: { id: string; name: string } | null;
}

interface ActiveCaseRow {
  appeal: CaseAppeal;
  proc: CaseProceeding;
  demand: { proposed: number; accepted: number; dropped: number; disputed: number };
}

interface Props {
  clientId: string;
  clientName: string;
  openProceedingsCount: number;
  summaryByCategory: SummaryByCategory;
  activeCaseRows: ActiveCaseRow[];
  portfolioTotals: { proposed: number; accepted: number; dropped: number; disputed: number };
  acts: NamedRecord[];
  financialYears: NamedRecord[];
  currentActs: string[];
  currentFYs: string[];
  currentStatuses: string[];
  currentCategory?: string;
  canEdit: boolean;
}

const STATUS_OPTIONS: NamedRecord[] = [
  { id: "open", name: "Open" },
  { id: "closed", name: "Closed" },
];

const STATUS_DISPLAY: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-blue-50 text-blue-700" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-500" },
};

export default function ProceedingClientDetailClient({
  clientId,
  clientName,
  openProceedingsCount,
  summaryByCategory,
  activeCaseRows,
  portfolioTotals,
  acts,
  financialYears,
  currentActs,
  currentFYs,
  currentStatuses,
  currentCategory,
  canEdit,
}: Props) {
  const router = useRouter();

  function push(updates: Record<string, string>) {
    const merged: Record<string, string> = {
      act: currentActs.join(","),
      fy: currentFYs.join(","),
      status: currentStatuses.join(","),
      category: currentCategory ?? "",
      ...updates,
    };
    const p = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (!v) return;
      p.set(k, v);
    });
    router.push(`/proceedings/${clientId}${p.toString() ? `?${p.toString()}` : ""}`);
  }

  // Editing the Act chip directly makes it the source of truth — drop the
  // one-time `category` seed so it doesn't keep re-deriving the act list.
  function setActFilter(ids: string[]) {
    push({ act: ids.join(","), category: "" });
  }

  function setFYFilter(ids: string[]) {
    push({ fy: ids.join(",") });
  }

  // Status needs an explicit "all" sentinel (absent = Open only, the default).
  function setStatusFilter(ids: string[]) {
    push({ status: ids.length ? ids.join(",") : "all" });
  }

  return (
    <div>
      <Link href="/proceedings" className="text-sm text-secondary hover:text-heading flex items-center gap-1 mb-3">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Proceedings
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-heading mb-1">{clientName}</h1>
          <p className="text-sm text-secondary">Proceedings overview for this client.</p>
        </div>
        {canEdit && (
          <Link
            href={`/litigations/new?client=${clientId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Litigation
          </Link>
        )}
      </div>

      {/* Total Open Proceedings + Proceedings Summary (same layout/breakdown
          as Level 1's Total no. of clients + Proceedings Summary, scoped to
          this client) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 mb-8">
        <div className="bg-white border-l-4 border-l-success border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-secondary mb-2">Total Open Proceedings</p>
          <p className="text-4xl font-bold text-heading">{openProceedingsCount}</p>
        </div>
        <ProceedingsSummaryTable summaryByCategory={summaryByCategory} />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-heading">Active Cases</h2>
        <div className="flex items-center gap-2">
          <MultiSelect options={acts} values={currentActs} onChange={setActFilter} placeholder="All Acts" />
          <MultiSelect options={financialYears} values={currentFYs} onChange={setFYFilter} placeholder="All FY/TY" />
          <MultiSelect
            options={STATUS_OPTIONS}
            values={currentStatuses}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            searchable={false}
          />
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="thead-row">
                <th className="th-std">#</th>
                <th className="th-std">Act</th>
                <th className="th-std">FY/TY</th>
                <th className="th-std">Litigation Type</th>
                <th className="th-std">Proceeding</th>
                <th className="th-std">Status</th>
                <th className="th-std">Jurisdiction</th>
                <th className="th-std">Limitation</th>
                <th className="th-std text-right">Proposed</th>
                <th className="th-std text-right">Dropped</th>
                <th className="th-std text-right">Accepted</th>
                <th className="th-std text-right">Disputed</th>
              </tr>
            </thead>
            <tbody>
              {activeCaseRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="td-std text-center text-muted py-8">
                    No proceedings match the current filters.
                  </td>
                </tr>
              ) : (
                activeCaseRows.map(({ appeal, proc, demand }, i) => {
                  const ps = STATUS_DISPLAY[proc.status ?? "open"];
                  const jurisdiction = proc.jurisdiction_city || proc.jurisdiction || "—";
                  const limitDate = proc.to_be_completed_by
                    ? new Date(proc.to_be_completed_by).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";
                  return (
                    <tr
                      key={proc.id}
                      className={`border-b border-border last:border-0 hover:bg-accent-light transition-colors cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-page"}`}
                      onClick={() => router.push(`/litigations/${appeal.id}`)}
                    >
                      <td className="td-rownum">{i + 1}</td>
                      <td className="td-std max-w-52 truncate" title={appeal.act_regulation?.name ?? "—"}>
                        {appeal.act_regulation?.name ?? "—"}
                      </td>
                      <td className="td-std">{appeal.financial_year?.name ?? "—"}</td>
                      <td className="td-std max-w-44 truncate" title={appeal.litigation_type?.name ?? "—"}>
                        {appeal.litigation_type?.name ?? "—"}
                      </td>
                      <td className="td-std max-w-40 truncate" title={proc.proceeding_type?.name ?? "—"}>
                        {proc.proceeding_type?.name ?? "—"}
                      </td>
                      <td className="td-std">
                        {ps ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ps.cls}`}>
                            {ps.label}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="td-std max-w-36 truncate" title={jurisdiction}>
                        {jurisdiction}
                      </td>
                      <td className="td-std">{limitDate}</td>
                      <td className="td-std text-right">₹{fmtInr(demand.proposed)}</td>
                      <td className="td-std text-right">₹{fmtInr(demand.dropped)}</td>
                      <td className="td-std text-right text-success">₹{fmtInr(demand.accepted)}</td>
                      <td className="td-std text-right text-danger">₹{fmtInr(demand.disputed)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {activeCaseRows.length > 0 && (
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-medium">Total Portfolio Value</span>
            <div className="flex items-center gap-6 text-sm">
              <span>
                Proposed: <span className="font-semibold">₹{fmtInr(portfolioTotals.proposed)}</span>
              </span>
              <span>
                Dropped: <span className="font-semibold">₹{fmtInr(portfolioTotals.dropped)}</span>
              </span>
              <span>
                Accepted: <span className="font-semibold text-success">₹{fmtInr(portfolioTotals.accepted)}</span>
              </span>
              <span>
                Disputed: <span className="font-semibold text-danger">₹{fmtInr(portfolioTotals.disputed)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
