"use client";

import React, { useState } from "react";

const FLAT_TABS = [
  { key: "business_type",   label: "Business Types",   colLabel: "Business Type"   },
  { key: "financial_year",  label: "Financial Years",  colLabel: "Financial Year"  },
  { key: "assessment_year", label: "Assessment Years", colLabel: "Assessment Year" },
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

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function SpMastersClient({ records }: Props) {
  const [activeTab, setActiveTab] = useState("business_type");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [actChildTab, setActChildTab] = useState<
    Record<string, "proceeding_type" | "litigation_type">
  >({});

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
  const litTypesByAct = records
    .filter(r => r.type === "litigation_type" && r.parent_id)
    .reduce((acc, r) => {
      if (!acc[r.parent_id!]) acc[r.parent_id!] = [];
      acc[r.parent_id!].push(r);
      return acc;
    }, {} as Record<string, MasterRecord[]>);

  const allTabs = [...FLAT_TABS, { key: ACTS_TAB, label: "Acts & Proceedings", colLabel: "" }];
  const activeTabDef = FLAT_TABS.find(t => t.key === activeTab);

  const toggleAct = (id: string) => setExpandedActs(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

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

      {/* ── Flat list tabs ─────────────────────────────────────────────────────── */}
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
                  <th className="text-left px-4 py-3 font-semibold text-heading w-20">Sl. No.</th>
                  <th className="text-left px-4 py-3 font-semibold text-heading">
                    {!isFYorAY ? (
                      <button onClick={() => setSortAsc(!sortAsc)} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                        {activeTabDef?.colLabel ?? "Name"}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {sortAsc ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                        </svg>
                      </button>
                    ) : (activeTabDef?.colLabel ?? "Name")}
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-heading w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-secondary">{search ? `No results for "${search}"` : "No records in this category."}</td></tr>
                ) : filtered.map((rec, i) => (
                  <tr key={rec.id} className={`hover:bg-page transition-colors ${i % 2 === 1 ? "bg-stripe" : ""}`}>
                    <td className="px-4 py-3 text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-secondary">{rec.name}</td>
                    <td className="px-4 py-3"><StatusBadge active={rec.is_active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Acts & Proceedings table ────────────────────────────────────────────── */}
      {activeTab === ACTS_TAB && (
        <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-table-header border-b-2 border-table-header-border">
                <th className="text-left px-4 py-3 font-semibold text-heading w-20">Sl. No.</th>
                <th className="text-left px-4 py-3 font-semibold text-heading">Act / Proceeding</th>
                <th className="text-left px-4 py-3 font-semibold text-heading w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {acts.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-secondary">No acts configured.</td></tr>
              ) : acts.map((act, actIdx) => {
                const procs = (procsByAct[act.id] ?? []).sort((a, b) => a.sort_order - b.sort_order);
                const litTypes = (litTypesByAct[act.id] ?? []).sort((a, b) => a.sort_order - b.sort_order);
                const isExpanded = expandedActs.has(act.id);
                const selectedChildType = actChildTab[act.id] ?? "proceeding_type";
                const isProc = selectedChildType === "proceeding_type";
                const children = isProc ? procs : litTypes;
                const childLabel = isProc ? "proceeding" : "litigation type";
                return (
                  <React.Fragment key={act.id}>
                    {/* Act row */}
                    <tr onClick={() => toggleAct(act.id)} className="hover:bg-page transition-colors cursor-pointer bg-accent-light">
                      <td className="px-4 py-3 text-muted text-xs font-semibold">{actIdx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg className={`w-3.5 h-3.5 text-secondary flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-semibold text-heading">{act.name}</span>
                          <span className="text-xs text-muted">({procs.length} proceeding{procs.length !== 1 ? "s" : ""} · {litTypes.length} litigation type{litTypes.length !== 1 ? "s" : ""})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge active={act.is_active} /></td>
                    </tr>

                    {/* Proceeding / Litigation Type sub-tab switcher */}
                    {isExpanded && (
                      <tr className="bg-white">
                        <td colSpan={3} className="px-4 pt-2 pb-1 pl-14">
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActChildTab((prev) => ({ ...prev, [act.id]: "proceeding_type" }));
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${isProc ? "bg-primary text-white" : "text-secondary hover:text-heading hover:bg-page"}`}
                            >
                              Proceeding ({procs.length})
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActChildTab((prev) => ({ ...prev, [act.id]: "litigation_type" }));
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${!isProc ? "bg-primary text-white" : "text-secondary hover:text-heading hover:bg-page"}`}
                            >
                              Litigation Type ({litTypes.length})
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Selected sub-tab's rows */}
                    {isExpanded && children.map((child, childIdx) => (
                      <tr key={child.id} className={`${childIdx % 2 === 0 ? "bg-white" : "bg-stripe"}`}>
                        <td className="px-4 py-2.5 text-muted text-xs pl-8">{actIdx + 1}.{String.fromCharCode(97 + childIdx)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 pl-5">
                            <span className="w-1 h-1 rounded-full bg-border-strong flex-shrink-0" />
                            <span className="text-secondary">{child.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><StatusBadge active={child.is_active} /></td>
                      </tr>
                    ))}

                    {isExpanded && children.length === 0 && (
                      <tr className="bg-white">
                        <td colSpan={3} className="px-4 py-3 pl-14 text-xs text-muted italic">No {childLabel}s configured.</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Master records are managed by the AppealDesk platform administrator.
      </p>
    </div>
  );
}
