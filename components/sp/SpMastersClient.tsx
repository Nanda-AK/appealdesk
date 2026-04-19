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

  const filtered = records.filter((r) => r.type === activeTab);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-[#E5E7EB] rounded-xl p-1 w-fit shadow-sm">
        {MASTER_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
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

      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-8">#</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Name</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-[#6B7280] text-sm">
                  No records in this category.
                </td>
              </tr>
            ) : (
              filtered.map((record, i) => (
                <tr key={record.id} className="hover:bg-[#F8F9FA] transition-colors">
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">{i + 1}</td>
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
