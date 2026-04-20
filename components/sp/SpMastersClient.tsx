"use client";

import { useState } from "react";

const MASTER_TYPES = [
  { key: "business_type", label: "Business Types" },
  { key: "proceeding_type", label: "Proceeding Types" },
  { key: "act_regulation", label: "Act / Regulation" },
  { key: "financial_year", label: "Financial Year" },
  { key: "assessment_year", label: "Assessment Year" },
];

interface MasterRecord {
  id: string;
  name: string;
  type: string;
  level: string;
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

  const q = search.toLowerCase();
  const filtered = records
    .filter((r) => r.type === activeTab)
    .filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.is_active ? "active" : "inactive").includes(q)
    )
    .sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-[#E5E7EB] rounded-xl p-1 w-fit shadow-sm">
        {MASTER_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSearch(""); setSortAsc(true); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === t.key
                ? "bg-[#1E3A5F] text-white"
                : "text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F8F9FA]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="mb-3">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or status…"
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
          />
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
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-[#6B7280] text-sm">
                  {search ? `No results for "${search}"` : "No records in this category."}
                </td>
              </tr>
            ) : (
              filtered.map((record, i) => (
                <tr key={record.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                  <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
                  <td className="px-4 py-3 text-[#1A1A2E]">{record.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${record.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {record.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[#9CA3AF]">
        Master records are managed by the AppealDesk platform administrator.
      </p>
    </div>
  );
}
