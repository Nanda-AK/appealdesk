"use client";

import { useState } from "react";
import { createSpMasterRecord, deleteSpMasterRecord } from "@/app/(sp)/masters/actions";

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

export default function SpMastersClient({ records, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState("business_type");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const allFiltered = records.filter((r) => r.type === activeTab);
  const platformRecords = allFiltered.filter((r) => r.level === "platform");
  const spRecords = allFiltered.filter((r) => r.level === "service_provider");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createSpMasterRecord(newName.trim(), activeTab);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await deleteSpMasterRecord(confirmDelete.id);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-[#E5E7EB] rounded-xl p-1 w-fit shadow-sm">
        {MASTER_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setNewName(""); setError(null); }}
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
        {/* Add new SP record */}
        {isAdmin && (
          <div className="p-4 border-b border-[#E5E7EB]">
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`Add custom ${MASTER_TYPES.find((t) => t.key === activeTab)?.label.slice(0, -1).toLowerCase() ?? "record"}…`}
                className="flex-1 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="px-4 py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </form>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>
        )}

        {/* Records list */}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Name</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Source</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Status</th>
              {isAdmin && <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {allFiltered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-4 py-10 text-center text-[#6B7280] text-sm">
                  No records in this category yet.{isAdmin ? " Add one above." : ""}
                </td>
              </tr>
            ) : (
              <>
                {/* Platform records (read-only) */}
                {platformRecords.map((record, i) => (
                  <tr key={record.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                    <td className="px-4 py-3 text-[#1A1A2E]">{record.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4A6FA5]">
                        Platform
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${record.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {record.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-xs text-[#9CA3AF]">Platform managed</td>
                    )}
                  </tr>
                ))}

                {/* SP-level records (editable) */}
                {spRecords.map((record, i) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-[#F8F9FA] transition-colors ${(platformRecords.length + i) % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}
                  >
                    <td className="px-4 py-3 text-[#1A1A2E]">{record.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                        Custom
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${record.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {record.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setConfirmDelete({ id: record.id, name: record.name })}
                          disabled={deleting === record.id}
                          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          {deleting === record.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Info note */}
      <p className="mt-3 text-xs text-[#9CA3AF]">
        Platform records are managed by AppealDesk and are read-only. Custom records are specific to your workspace.
      </p>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Delete Custom Record?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              Deleting <strong>"{confirmDelete.name}"</strong> is permanent and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!!deleting}
                className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
