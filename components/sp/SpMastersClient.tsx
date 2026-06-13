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

  const allTabs = [...FLAT_TABS, { key: ACTS_TAB, label: "Acts" }];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-border rounded-xl p-1 w-fit shadow-sm flex-wrap">
        {allTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSearch(""); setSortAsc(true); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === t.key ? "bg-primary text-white" : "text-secondary hover:text-heading hover:bg-page"}`}
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
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or status…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-accent rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white" />
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-table-header border-b-2 border-table-header-border">
                  <th className="text-center px-4 py-3 font-semibold text-heading w-10">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-heading">
                    <button onClick={() => setSortAsc(!sortAsc)} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                      Name
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {sortAsc ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                      </svg>
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-heading w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-secondary">{search ? `No results for "${search}"` : "No records in this category."}</td></tr>
                ) : filtered.map((rec, i) => (
                  <tr key={rec.id} className={`hover:bg-page transition-colors ${i % 2 === 1 ? "bg-stripe" : ""}`}>
                    <td className="px-4 py-3 text-center text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-secondary">{rec.name}</td>
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
              <div key={act.id} className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Act header */}
                <div className="flex items-center gap-3 px-5 py-4 bg-page">
                  <button
                    onClick={() => setExpandedActs(prev => { const s = new Set(prev); if (s.has(act.id)) s.delete(act.id); else s.add(act.id); return s; })}
                    className="text-secondary hover:text-heading transition flex-shrink-0">
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-heading flex-1">{act.name}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${act.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {act.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-muted">{procs.length} proceeding{procs.length !== 1 ? "s" : ""}</span>
                </div>

                {isExpanded && procs.length > 0 && (
                  <div className="divide-y divide-surface-hover border-t border-border">
                    {procs.map((proc, i) => (
                      <div key={proc.id} className={`flex items-center gap-3 px-6 py-3 ${i % 2 === 1 ? "bg-stripe" : ""}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-table-header-border flex-shrink-0" />
                        <span className="text-sm text-heading flex-1">{proc.name}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${proc.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {proc.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && procs.length === 0 && (
                  <p className="px-6 py-4 text-sm text-muted italic border-t border-border">No proceedings configured.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Master records are managed by the AppealDesk platform administrator.
      </p>
    </div>
  );
}
