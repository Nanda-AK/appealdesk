"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Proceeding {
  id: string;
  proceeding_type: string | null;
  authority_name: string | null;
  importance: string | null;
  to_be_completed_by: string | null;
  assigned_to: string | null;
  possible_outcome: string | null;
  is_active: boolean;
  assigned_user: { first_name: string; last_name: string } | null;
}

interface Appeal {
  id: string;
  act_regulation: string | null;
  financial_year: string | null;
  assessment_year: string | null;
  created_at: string;
  client_org: { id: string; name: string } | null;
  proceedings: Proceeding[];
}

interface Props {
  appeals: Appeal[];
  clients: { id: string; name: string }[];
  teamMembers: { id: string; first_name: string; last_name: string }[];
  canEdit: boolean;
}

const IMPORTANCE: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-red-100 text-red-700" },
  high: { label: "High", cls: "bg-orange-100 text-orange-700" },
  medium: { label: "Medium", cls: "bg-yellow-100 text-yellow-700" },
  low: { label: "Low", cls: "bg-green-100 text-green-700" },
};

const OUTCOME: Record<string, { label: string; cls: string }> = {
  favourable: { label: "Favourable", cls: "bg-green-100 text-green-700" },
  doubtful: { label: "Doubtful", cls: "bg-yellow-100 text-yellow-700" },
  unfavourable: { label: "Unfavourable", cls: "bg-red-100 text-red-700" },
};

function activeProceeding(proceedings: Proceeding[]): Proceeding | null {
  if (!proceedings?.length) return null;
  return proceedings.find((p) => p.is_active) ?? proceedings[proceedings.length - 1];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AppealsClient({ appeals, clients, teamMembers, canEdit }: Props) {
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterAY, setFilterAY] = useState("");
  const [filterImportance, setFilterImportance] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");

  const assessmentYears = useMemo(() => {
    const s = new Set(appeals.map((a) => a.assessment_year).filter(Boolean) as string[]);
    return Array.from(s).sort().reverse();
  }, [appeals]);

  const filtered = useMemo(() => {
    return appeals.filter((a) => {
      const clientName = a.client_org?.name ?? "";
      const proc = activeProceeding(a.proceedings);
      if (search && !clientName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterClient && a.client_org?.id !== filterClient) return false;
      if (filterAY && a.assessment_year !== filterAY) return false;
      if (filterImportance && proc?.importance !== filterImportance) return false;
      if (filterAssigned && proc?.assigned_to !== filterAssigned) return false;
      return true;
    });
  }, [appeals, search, filterClient, filterAY, filterImportance, filterAssigned]);

  const hasFilters = search || filterClient || filterAY || filterImportance || filterAssigned;
  const selCls = "px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">Appeals</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {filtered.length} of {appeals.length} appeals
          </p>
        </div>
        {canEdit && (
          <Link
            href="/appeals/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Appeal
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-44"
        />
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className={selCls}>
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterAY} onChange={(e) => setFilterAY(e.target.value)} className={selCls}>
          <option value="">All Years</option>
          {assessmentYears.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterImportance} onChange={(e) => setFilterImportance(e.target.value)} className={selCls}>
          <option value="">All Importance</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)} className={selCls}>
          <option value="">All Staff</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setFilterClient(""); setFilterAY(""); setFilterImportance(""); setFilterAssigned(""); }}
            className="px-3 py-2 text-sm text-[#6B7280] hover:text-[#1A1A2E] border border-[#E5E7EB] rounded-lg transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-10">#</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Client</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">FY / AY</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Act</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Forum</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Importance</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Assigned To</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Deadline</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Outcome</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[#6B7280]">
                    {hasFilters
                      ? "No appeals match your filters."
                      : canEdit
                      ? "No appeals yet. Click 'New Appeal' to get started."
                      : "No appeals found."}
                  </td>
                </tr>
              ) : (
                filtered.map((appeal, i) => {
                  const proc = activeProceeding(appeal.proceedings);
                  const impCfg = proc?.importance ? IMPORTANCE[proc.importance] : null;
                  const outCfg = proc?.possible_outcome ? OUTCOME[proc.possible_outcome] : null;
                  const au = proc?.assigned_user ?? null;
                  return (
                    <tr key={appeal.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3 text-[#9CA3AF] text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E] whitespace-nowrap max-w-[180px] truncate">
                        {appeal.client_org?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap text-xs">
                        {appeal.financial_year && <span>{appeal.financial_year}</span>}
                        {appeal.financial_year && appeal.assessment_year && <span className="text-[#D1D5DB]"> / </span>}
                        {appeal.assessment_year && <span>{appeal.assessment_year}</span>}
                        {!appeal.financial_year && !appeal.assessment_year && "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap max-w-[140px] truncate">
                        {appeal.act_regulation ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#1A1A2E] whitespace-nowrap">{proc?.proceeding_type ?? "—"}</td>
                      <td className="px-4 py-3">
                        {impCfg ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${impCfg.cls}`}>
                            {impCfg.label}
                          </span>
                        ) : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                        {au ? `${au.first_name} ${au.last_name}` : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                        {fmtDate(proc?.to_be_completed_by ?? null)}
                      </td>
                      <td className="px-4 py-3">
                        {outCfg ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${outCfg.cls}`}>
                            {outCfg.label}
                          </span>
                        ) : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/appeals/${appeal.id}`}
                          className="text-[#4A6FA5] hover:text-[#1E3A5F] text-xs font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
