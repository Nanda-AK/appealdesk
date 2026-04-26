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
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
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

  const q = search.toLowerCase();
  function applyFilter(list: UserRecord[]) {
    return list
      .filter((u) => {
        const name = fullName(u).toLowerCase();
        const role = (ROLE_LABELS[u.role] ?? u.role).toLowerCase();
        const status = u.is_active ? "active" : "inactive";
        return (
          name.includes(q) ||
          u.email.toLowerCase().includes(q) ||
          role.includes(q) ||
          (u.designation ?? "").toLowerCase().includes(q) ||
          (u.organization?.name ?? "").toLowerCase().includes(q) ||
          status.includes(q)
        );
      })
      .sort((a, b) => {
        const na = fullName(a), nb = fullName(b);
        return sortAsc ? na.localeCompare(nb) : nb.localeCompare(na);
      });
  }

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
    const rows = applyFilter(list);
    return (
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
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Email</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Role</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Organisation</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Designation</th>
                <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Status</th>
                {isAdmin && <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-[#6B7280]">
                    {search ? `No results for "${search}"` : "No users found."}
                  </td>
                </tr>
              ) : rows.map((u, i) => (
                <tr key={u.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                  <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
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
                      <div className="flex items-center gap-0.5">
                        <Link href={`/users/${u.id}/edit`} title="Edit user" className="p-1.5 rounded hover:bg-[#F3F4F6] transition-colors text-[#4A6FA5] hover:text-[#1E3A5F] inline-flex">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Link>
                        {u.id !== currentUserId && (
                          <>
                            <button onClick={() => handleToggle(u.id, u.is_active)} disabled={togglingId === u.id}
                              title={u.is_active ? "Deactivate user" : "Activate user"}
                              className={`p-1.5 rounded hover:bg-[#F3F4F6] transition-colors disabled:opacity-50 inline-flex ${u.is_active ? "text-amber-500 hover:text-amber-700" : "text-green-600 hover:text-green-800"}`}>
                              {u.is_active ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              )}
                            </button>
                            <button onClick={() => setConfirmDelete({ id: u.id, name: fullName(u) })} title="Delete user"
                              className="p-1.5 rounded hover:bg-[#F3F4F6] transition-colors text-red-500 hover:text-red-700 inline-flex">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
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
      {/* Search bar */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            placeholder="Search users…"
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
          />
        </div>
      </div>

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
