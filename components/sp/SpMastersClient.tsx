"use client";

import { useState } from "react";

const FLAT_TABS = [
  { key: "business_type", label: "Business Types" },
  { key: "financial_year", label: "Financial Years" },
  { key: "assessment_year", label: "Assessment Years" },
];

const ACTS_TAB = "acts_proceedings";

interface MasterRecord {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  records: MasterRecord[];
  isAdmin: boolean;
}

export default function SpMastersClient({ records }: Props) {
  const [activeTab, setActiveTab] = useState("business_type");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());

  const q = search.toLowerCase();
  const isFYorAY = activeTab === "financial_year" || activeTab === "assessment_year";
  const filtered = records
    .filter(r => r.type === activeTab && r.parent_id === null)
    .filter(r => r.name.toLowerCase().includes(q) || (r.is_active ? "active" : "inactive").includes(q))
    .sort((a, b) => (isFYorAY ? true : !sortAsc) ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));

  const acts = records.filter(r => r.type === "act_regulation").sort((a, b) => a.sort_order - b.sort_order);
  const procsByAct = records
    .filter(r => r.type === "proceeding_type" && r.parent_id)
    .reduce((acc, r) => {
      if (!acc[r.parent_id!]) acc[r.parent_id!] = [];
      acc[r.parent_id!].push(r);
      return acc;
    }, {} as Record<string, MasterRecord[]>);

  const allTabs = [...FLAT_TABS, { key: ACTS_TAB, label: "Acts & Proceedings" }];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-[#E5E7EB] rounded-xl p-1 w-fit shadow-sm flex-wrap">
        {allTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSearch(""); setSortAsc(true); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === t.key ? "bg-[#1E3A5F] text-white" : "text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F8F9FA]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Flat list (read-only) ─────────────────────────────────────────────── */}
      {activeTab !== ACTS_TAB && (
        <>
          <div className="mb-3">
            <div className="relative max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or status…"
                className="w-full pl-9 pr-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white" />
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#D1D9E6] border-b-2 border-[#B0BDD0]">
                  <th className="text-center px-4 py-3 font-medium text-[#1A1A2E] w-10">#</th>
                  <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">
                    <button onClick={() => setSortAsc(!sortAsc)} className="inline-flex items-center gap-1 hover:text-[#1E3A5F] transition-colors">
                      Name
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {sortAsc ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                      </svg>
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-[#6B7280]">{search ? `No results for "${search}"` : "No records in this category."}</td></tr>
                ) : filtered.map((rec, i) => (
                  <tr key={rec.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                    <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-[#1A1A2E]">{rec.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${rec.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {rec.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Acts & Proceedings tree (read-only) ──────────────────────────────── */}
      {activeTab === ACTS_TAB && (
        <div className="space-y-3">
          {acts.map(act => {
            const procs = (procsByAct[act.id] ?? []).sort((a, b) => a.sort_order - b.sort_order);
            const isExpanded = expandedActs.has(act.id);

            return (
              <div key={act.id} className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
                {/* Act header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-[#F8F9FA]">
                  <button
                    onClick={() => setExpandedActs(prev => { const s = new Set(prev); s.has(act.id) ? s.delete(act.id) : s.add(act.id); return s; })}
                    className="text-[#6B7280] hover:text-[#1A1A2E] transition flex-shrink-0">
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-[#1A1A2E] flex-1">{act.name}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${act.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {act.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">{procs.length} proceeding{procs.length !== 1 ? "s" : ""}</span>
                </div>

                {isExpanded && procs.length > 0 && (
                  <div className="divide-y divide-[#F3F4F6] border-t border-[#E5E7EB]">
                    {procs.map((proc, i) => (
                      <div key={proc.id} className={`flex items-center gap-3 px-6 py-3 ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B0BDD0] flex-shrink-0" />
                        <span className="text-sm text-[#1A1A2E] flex-1">{proc.name}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${proc.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {proc.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && procs.length === 0 && (
                  <p className="px-6 py-4 text-sm text-[#9CA3AF] italic border-t border-[#E5E7EB]">No proceedings configured.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-[#9CA3AF]">
        Master records are managed by the AppealDesk platform administrator.
      </p>
    </div>
  );
}
