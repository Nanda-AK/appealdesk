"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleClientStatus, deleteClient } from "@/app/(sp)/clients/actions";

interface Client {
  id: string;
  name: string;
  business_type?: string;
  city?: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  clients: Client[];
  isAdmin: boolean;
}

export default function ClientsClient({ clients, isAdmin }: Props) {
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; activate: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const q = search.toLowerCase();
  const filtered = clients
    .filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.business_type ?? "").toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q) ||
      (c.is_active ? "active" : "inactive").includes(q)
    )
    .sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  async function handleToggle() {
    if (!confirm) return;
    setLoading(confirm.id);
    try {
      await toggleClientStatus(confirm.id, confirm.activate);
    } finally {
      setLoading(null);
      setConfirm(null);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteClient(deleteConfirm.id);
      window.location.href = "/clients";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete client.");
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Business Type</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">City</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Added</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#6B7280]">
                    {search ? `No results for "${search}"` : "No clients yet. Add the first one."}
                  </td>
                </tr>
              ) : (
                filtered.map((client, i) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}
                  >
                    <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-[#1A1A2E]">{client.name}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{client.business_type ?? "—"}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{client.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          client.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {client.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {new Date(client.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-[#4A6FA5] hover:text-[#1E3A5F] text-xs font-medium"
                        >
                          {isAdmin ? "Edit" : "View"}
                        </Link>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() =>
                                setConfirm({ id: client.id, name: client.name, activate: !client.is_active })
                              }
                              disabled={loading === client.id}
                              className={`text-xs font-medium disabled:opacity-50 ${
                                client.is_active
                                  ? "text-orange-500 hover:text-orange-700"
                                  : "text-green-600 hover:text-green-800"
                              }`}
                            >
                              {client.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => { setDeleteError(null); setDeleteConfirm({ id: client.id, name: client.name }); }}
                              className="text-xs font-medium text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Delete Client?</h3>
            <p className="text-sm text-[#6B7280] mb-2">
              This will permanently delete <strong>{deleteConfirm.name}</strong> and all associated
              appeals, proceedings, events, and documents.
            </p>
            <p className="text-xs text-red-600 font-medium mb-5">This action cannot be undone.</p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate/Deactivate Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">
              {confirm.activate ? "Activate" : "Deactivate"} Client?
            </h3>
            <p className="text-sm text-[#6B7280] mb-5">
              {confirm.activate
                ? `"${confirm.name}" will be activated and accessible to its users.`
                : `"${confirm.name}" will be deactivated.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleToggle}
                disabled={!!loading}
                className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition disabled:opacity-60 ${
                  confirm.activate ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {loading ? "Processing…" : confirm.activate ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
