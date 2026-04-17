"use client";

import { useState } from "react";
import { createUser, toggleUserStatus, deleteUser } from "@/app/(sp)/users/actions";

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
  organization: { id: string; name: string; type: string }[] | null;
}

interface ClientOrg {
  id: string;
  name: string;
}

interface Props {
  users: UserRecord[];
  clientOrgs: ClientOrg[];
  currentUserId: string;
  isAdmin: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  sp_admin: "Admin",
  sp_staff: "Staff",
  client: "Client",
};

const ROLE_COLORS: Record<string, string> = {
  sp_admin: "bg-purple-50 text-purple-700",
  sp_staff: "bg-blue-50 text-blue-700",
  client: "bg-orange-50 text-orange-700",
};

function fullName(u: { first_name: string; middle_name: string | null; last_name: string }) {
  return [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
}

export default function UsersClient({ users, clientOrgs, currentUserId, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<"team" | "clients">("team");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create user form state
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"sp_admin" | "sp_staff" | "client">("sp_staff");
  const [clientOrgId, setClientOrgId] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const teamUsers = users.filter((u) => u.role === "sp_admin" || u.role === "sp_staff");
  const clientUsers = users.filter((u) => u.role === "client");

  function resetForm() {
    setFirstName(""); setMiddleName(""); setLastName("");
    setEmail(""); setPassword(""); setShowPassword(false);
    setRole("sp_staff"); setClientOrgId("");
    setDesignation(""); setDepartment("");
    setCreateError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) { setCreateError("First name is required."); return; }
    if (!lastName.trim()) { setCreateError("Last name is required."); return; }
    if (!email.trim()) { setCreateError("Email is required."); return; }
    if (password.length < 8) { setCreateError("Password must be at least 8 characters."); return; }
    if (role === "client" && !clientOrgId) { setCreateError("Please select a client organisation."); return; }

    setCreating(true);
    setCreateError(null);
    try {
      await createUser({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        role,
        client_org_id: role === "client" ? clientOrgId : undefined,
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
      });
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user.");
      setCreating(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    setTogglingId(id);
    try {
      await toggleUserStatus(id, !isActive);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteUser(confirmDelete.id);
      setConfirmDelete(null);
    } finally {
      setDeletingId(null);
    }
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
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-[#6B7280]">
                    No users found.
                  </td>
                </tr>
              ) : (
                list.map((u, i) => (
                  <tr key={u.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                    <td className="px-4 py-3 font-medium text-[#1A1A2E]">
                      {fullName(u)}
                      {u.id === currentUserId && (
                        <span className="ml-1.5 text-xs text-[#9CA3AF]">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{u.organization?.[0]?.name ?? "—"}</td>
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
                            <button
                              onClick={() => handleToggle(u.id, u.is_active)}
                              disabled={togglingId === u.id}
                              className={`text-xs font-medium disabled:opacity-50 ${u.is_active ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"}`}
                            >
                              {togglingId === u.id ? "…" : u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ id: u.id, name: fullName(u) })}
                              className="text-xs font-medium text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tab bar + Add User button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-sm">
          {(["team", "clients"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === tab
                  ? "bg-[#1E3A5F] text-white"
                  : "text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F8F9FA]"
              }`}
            >
              {tab === "team" ? `Team (${teamUsers.length})` : `Client Users (${clientUsers.length})`}
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        )}
      </div>

      <UserTable list={activeTab === "team" ? teamUsers : clientUsers} />

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1A1A2E]">Add User</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
                {createError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{createError}</div>
                )}

                {/* Name */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">First Name <span className="text-red-500">*</span></label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Middle Name</label>
                    <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Last Name <span className="text-red-500">*</span></label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2 pr-9 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {showPassword
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                        }
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-1">Share this with the user so they can log in immediately.</p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Role <span className="text-red-500">*</span></label>
                  <select value={role} onChange={(e) => { setRole(e.target.value as typeof role); setClientOrgId(""); }} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                    <option value="sp_admin">Admin</option>
                    <option value="sp_staff">Staff</option>
                    <option value="client">Client User</option>
                  </select>
                </div>

                {/* Client org — shown only for client role */}
                {role === "client" && (
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Client Organisation <span className="text-red-500">*</span></label>
                    <select value={clientOrgId} onChange={(e) => setClientOrgId(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                      <option value="">Select organisation</option>
                      {clientOrgs.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Designation + Department */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Designation</label>
                    <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. CA, Manager" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Department</label>
                    <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Tax, Audit" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="flex-1 px-4 py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
                    {creating ? "Creating…" : "Create User"}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Delete User?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              <strong>{confirmDelete.name}</strong> will be permanently deleted and lose all access. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={!!deletingId} className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                {deletingId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
