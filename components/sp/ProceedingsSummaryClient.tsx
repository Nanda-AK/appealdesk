"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MultiSelect, type NamedRecord } from "@/components/ui/MultiSelect";
import { fmtInr } from "@/lib/demand";
import ProceedingsSummaryTable, { type SummaryByCategory } from "@/components/sp/ProceedingsSummaryTable";

interface ClientAgg {
  clientId: string;
  clientName: string;
  it: number;
  gst: number;
  other: number;
  proposed: number;
  dropped: number;
  accepted: number;
  disputed: number;
}

interface Props {
  totalClients: number;
  summaryByCategory: SummaryByCategory;
  clientRows: ClientAgg[];
  clients: NamedRecord[];
  acts: NamedRecord[];
  currentClients: string[];
  currentActs: string[];
  currentStatuses: string[];
  canEdit: boolean;
}

const STATUS_OPTIONS: NamedRecord[] = [
  { id: "open", name: "Open" },
  { id: "closed", name: "Closed" },
];

export default function ProceedingsSummaryClient({
  totalClients,
  summaryByCategory,
  clientRows,
  clients,
  acts,
  currentClients,
  currentActs,
  currentStatuses,
  canEdit,
}: Props) {
  const router = useRouter();

  function push(updates: Record<string, string>) {
    const merged: Record<string, string> = {
      client: currentClients.join(","),
      act: currentActs.join(","),
      status: currentStatuses.join(","),
      ...updates,
    };
    const p = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (!v) return;
      p.set(k, v);
    });
    router.push(`/proceedings${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function setMultiFilter(key: string, ids: string[]) {
    push({ [key]: ids.join(",") });
  }

  // Status needs an explicit "all" sentinel — absent status param means
  // "Open only" (the default), so "no filter" must be spelled out.
  function setStatusFilter(ids: string[]) {
    push({ status: ids.length ? ids.join(",") : "all" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-heading mb-1">Proceedings</h1>
          <p className="text-sm text-secondary">
            Comprehensive portfolio summary and proceeding status.
          </p>
        </div>
        {canEdit && (
          <Link
            href="/litigations/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Litigation
          </Link>
        )}
      </div>

      {/* Top row: total clients + category summary */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 mb-8">
        <div className="bg-white border-l-4 border-l-success border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <p className="text-sm text-secondary mb-2">Total no. of clients</p>
          <p className="text-4xl font-bold text-heading">{totalClients}</p>
        </div>

        <ProceedingsSummaryTable summaryByCategory={summaryByCategory} />
      </div>

      {/* Filters + client table */}
      <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-heading">Proceeding by Clients</h2>
            <p className="text-sm text-secondary">Real-time proceeding status per client</p>
          </div>
          <div className="flex items-center gap-2">
            <MultiSelect
              options={clients}
              values={currentClients}
              onChange={(ids) => setMultiFilter("client", ids)}
              placeholder="All Clients"
            />
            <MultiSelect
              options={acts}
              values={currentActs}
              onChange={(ids) => setMultiFilter("act", ids)}
              placeholder="All Acts"
            />
            <MultiSelect
              options={STATUS_OPTIONS}
              values={currentStatuses}
              onChange={setStatusFilter}
              placeholder="All Statuses"
              searchable={false}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="thead-row">
                <th className="th-std">Sl. No.</th>
                <th className="th-std">Client Name</th>
                <th className="th-std text-right">IT</th>
                <th className="th-std text-right">GST</th>
                <th className="th-std text-right">Others</th>
                <th className="th-std text-right">Proposed Demand</th>
                <th className="th-std text-right">Dropped</th>
                <th className="th-std text-right">Accepted</th>
                <th className="th-std text-right">Disputed</th>
              </tr>
            </thead>
            <tbody>
              {clientRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="td-std text-center text-muted py-8">
                    No proceedings match the current filters.
                  </td>
                </tr>
              ) : (
                clientRows.map((row, i) => (
                  <tr
                    key={row.clientId}
                    className={`border-b border-border last:border-0 hover:bg-accent-light transition-colors cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-page"}`}
                    onClick={() => router.push(`/proceedings/${row.clientId}`)}
                  >
                    <td className="td-rownum">{i + 1}</td>
                    <td className="td-std font-medium text-heading">
                      <Link
                        href={`/proceedings/${row.clientId}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.clientName}
                      </Link>
                    </td>
                    <td className="td-std text-right">
                      <Link
                        href={`/proceedings/${row.clientId}?category=IT`}
                        className="hover:underline hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.it}
                      </Link>
                    </td>
                    <td className="td-std text-right">
                      <Link
                        href={`/proceedings/${row.clientId}?category=GST`}
                        className="hover:underline hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.gst}
                      </Link>
                    </td>
                    <td className="td-std text-right">
                      <Link
                        href={`/proceedings/${row.clientId}?category=Other`}
                        className="hover:underline hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.other}
                      </Link>
                    </td>
                    <td className="td-std text-right">₹{fmtInr(row.proposed)}</td>
                    <td className="td-std text-right">₹{fmtInr(row.dropped)}</td>
                    <td className="td-std text-right text-success">₹{fmtInr(row.accepted)}</td>
                    <td className="td-std text-right text-danger">₹{fmtInr(row.disputed)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
