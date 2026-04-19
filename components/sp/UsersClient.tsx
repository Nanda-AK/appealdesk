"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toggleUserStatus, deleteUser } from "@/app/(sp)/users/actions";

interface UserRecord {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  role: string;
  designation: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  org_id: string;
  organization: { id: string; name: string; type: string } | null;
}

interface ClientOrg { id: string; name: string; }

interface Props {
  users: UserRecord[];
  clientOrgs: ClientOrg[];
  currentUserId: string;
  isAdmin: boolean;
}

const ROLE_LABELS: Record<string, string> = { sp_admin: "Admin", sp_staff: "Staff", client: "Client" };
const ROLE_COLORS: Record<string, string> = {
  sp_admin: "bg-purple-50 text-purple-700",
  sp_staff: "bg-blue-50 text-blue-700",
  client: "bg-orange-50 text-orange-700",
};

function fullName(u: { first_name: string; middle_name: string | null; last_name: string }) {
  return [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
}


export default function UsersClient({ users, clientOrgs: _clientOrgs, currentUserId, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<"team" | "clients">("team");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const teamUsers = users.filter((u) => u.role === "sp_admin" || u.role === "sp_staff");
  const clientUsers = users.filter((u) => u.role === "client");

  // Read ?tab=clients from URL on mount to auto-switch tab after adding a client user
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "clients") setActiveTab("clients");
  }, []);

  async function handleToggle(id: string, isActive: boolean) {
    setTogglingId(id);
    try { await toggleUserStatus(id, !isActive); } finally { setTogglingId(null); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try { await deleteUser(confirmDelete.id); setConfirmDelete(null); } finally { setDeletingId(null); }
  }

  function UserTable({ list }: { list: UserRecord[] }) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Name</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Email</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Role</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Organisation</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Designation</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Status</th>
                {isAdmin && <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-[#6B7280]">No users found.</td>
                </tr>
              ) : list.map((u, i) => (
                <tr key={u.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                  <td className="px-4 py-3 font-medium text-[#1A1A2E]">
                    {fullName(u)}
                    {u.id === currentUserId && <span className="ml-1.5 text-xs text-[#9CA3AF]">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B7280]">{u.organization?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{u.designation ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {u.id !== currentUserId && (
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleToggle(u.id, u.is_active)} disabled={togglingId === u.id}
                            className={`text-xs font-medium disabled:opacity-50 ${u.is_active ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"}`}>
                            {togglingId === u.id ? "…" : u.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button onClick={() => setConfirmDelete({ id: u.id, name: fullName(u) })}
                            className="text-xs font-medium text-red-500 hover:text-red-700">Delete</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-sm">
          {(["team", "clients"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === tab ? "bg-[#1E3A5F] text-white" : "text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F8F9FA]"}`}>
              {tab === "team" ? `SP Users (${teamUsers.length})` : `Client Users (${clientUsers.length})`}
            </button>
          ))}
        </div>
        {isAdmin && (
          <Link
            href={activeTab === "team" ? "/users/new-sp" : "/users/new-client"}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {activeTab === "team" ? "Add SP User" : "Add Client User"}
          </Link>
        )}
      </div>

      <UserTable list={activeTab === "team" ? teamUsers : clientUsers} />

      {/* ── Confirm Delete ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Delete User?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              <strong>{confirmDelete.name}</strong> will be permanently deleted and lose all access. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={!!deletingId}
                className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                {deletingId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
