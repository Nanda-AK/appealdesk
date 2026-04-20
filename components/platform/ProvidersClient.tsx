"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleProviderStatus, createSpAdmin, deleteSpAdmin } from "@/app/(platform)/platform/providers/actions";
import { UserRole } from "@/lib/types";

interface Provider {
  id: string;
  name: string;
  business_type?: string;
  city?: string;
  is_active: boolean;
  created_at: string;
}

interface SpAdmin {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  org_id: string;
  is_active: boolean;
}

interface Props {
  providers: Provider[];
  adminsBySpId: Record<string, SpAdmin[] | undefined>;
  userRole: UserRole;
}

function fullName(u: { first_name: string; middle_name: string | null; last_name: string }) {
  return [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
}

export default function ProvidersClient({ providers, adminsBySpId, userRole }: Props) {
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; activate: boolean } | null>(null);

  const q = search.toLowerCase();
  const filtered = providers
    .filter((sp) =>
      sp.name.toLowerCase().includes(q) ||
      (sp.business_type ?? "").toLowerCase().includes(q) ||
      (sp.city ?? "").toLowerCase().includes(q) ||
      (sp.is_active ? "active" : "inactive").includes(q)
    )
    .sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  // Manage Admins modal state
  const [adminModal, setAdminModal] = useState<{ spId: string; spName: string } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [designation, setDesignation] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [confirmDeleteAdmin, setConfirmDeleteAdmin] = useState<{ id: string; name: string } | null>(null);

  function openAdminModal(sp: Provider) {
    setFirstName(""); setMiddleName(""); setLastName("");
    setEmail(""); setDesignation("");
    setInviteError(null); setInviteSuccess(false);
    setShowInviteForm(false);
    setAdminModal({ spId: sp.id, spName: sp.name });
  }

  function resetInviteForm() {
    setFirstName(""); setMiddleName(""); setLastName("");
    setEmail(""); setPassword(""); setShowPassword(false); setDesignation("");
    setInviteError(null); setInviteSuccess(false);
    setShowInviteForm(false);
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) { setInviteError("First name is required."); return; }
    if (!lastName.trim()) { setInviteError("Last name is required."); return; }
    if (!email.trim()) { setInviteError("Email is required."); return; }
    if (password.length < 8) { setInviteError("Password must be at least 8 characters."); return; }
    if (!adminModal) return;

    setInviting(true);
    setInviteError(null);
    try {
      await createSpAdmin(adminModal.spId, {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        designation: designation.trim() || undefined,
      });
      setInviteSuccess(true);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to create admin.");
    } finally {
      setInviting(false);
    }
  }

  async function handleDeleteAdmin() {
    if (!confirmDeleteAdmin || !adminModal) return;
    setDeletingAdminId(confirmDeleteAdmin.id);
    try {
      await deleteSpAdmin(confirmDeleteAdmin.id, adminModal.spId);
      setConfirmDeleteAdmin(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingAdminId(null);
    }
  }

  async function handleToggle() {
    if (!confirm) return;
    setLoading(confirm.id);
    try {
      await toggleProviderStatus(confirm.id, confirm.activate);
    } finally {
      setLoading(null);
      setConfirm(null);
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
            placeholder="Search service providers…"
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
          />
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#D1D9E6] border-b-2 border-[#B0BDD0]">
                <th className="text-center px-4 py-3 font-medium text-[#6B7280] w-10">#</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="inline-flex items-center gap-1 hover:text-[#1A1A2E] transition-colors"
                  >
                    Name
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {sortAsc
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      }
                    </svg>
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Business Type</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">City</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Admins</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Added</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#6B7280]">
                    {search ? `No results for "${search}"` : "No service providers yet. Add the first one."}
                  </td>
                </tr>
              ) : (
                filtered.map((sp, i) => {
                  const admins = adminsBySpId[sp.id] ?? [];
                  return (
                    <tr key={sp.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                      <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E]">{sp.name}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{sp.business_type ?? "—"}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{sp.city ?? "—"}</td>
                      <td className="px-4 py-3">
                        {admins.length === 0 ? (
                          <span className="text-xs text-amber-600 font-medium">No admin</span>
                        ) : (
                          <span className="text-xs text-[#6B7280]">{admins.length} admin{admins.length > 1 ? "s" : ""}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          sp.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}>
                          {sp.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(sp.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/platform/providers/${sp.id}`}
                            className="text-[#4A6FA5] hover:text-[#1E3A5F] text-xs font-medium"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => openAdminModal(sp)}
                            className="text-xs font-medium text-[#4A6FA5] hover:text-[#1E3A5F]"
                          >
                            Admins
                          </button>
                          <button
                            onClick={() => setConfirm({ id: sp.id, name: sp.name, activate: !sp.is_active })}
                            disabled={loading === sp.id}
                            className={`text-xs font-medium disabled:opacity-50 ${
                              sp.is_active ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"
                            }`}
                          >
                            {sp.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manage Admins Modal */}
      {adminModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1A1A2E]">Manage Admins</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">{adminModal.spName}</p>
              </div>
              <button onClick={() => setAdminModal(null)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Existing admins list */}
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Current Admins</p>
                {(adminsBySpId[adminModal.spId] ?? []).length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] py-2">No admins yet. Invite one below.</p>
                ) : (
                  <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-lg overflow-hidden">
                    {(adminsBySpId[adminModal.spId] ?? []).map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F8F9FA]">
                        <div>
                          <p className="text-sm font-medium text-[#1A1A2E]">{fullName(admin)}</p>
                          <p className="text-xs text-[#6B7280]">{admin.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${admin.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {admin.is_active ? "Active" : "Inactive"}
                          </span>
                          <button
                            onClick={() => setConfirmDeleteAdmin({ id: admin.id, name: fullName(admin) })}
                            disabled={deletingAdminId === admin.id}
                            className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite form */}
              {!showInviteForm && !inviteSuccess && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="w-full py-2 text-sm border border-dashed border-[#D1D5DB] rounded-lg text-[#4A6FA5] hover:border-[#4A6FA5] hover:bg-[#F8F9FA] transition font-medium"
                >
                  + Invite New Admin
                </button>
              )}

              {inviteSuccess && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                  <p className="text-sm font-medium text-green-800">Admin account created!</p>
                  <p className="text-xs text-green-700 mt-0.5">Share the email and password with the admin. They can log in immediately.</p>
                  <button
                    onClick={() => { setInviteSuccess(false); setShowInviteForm(true); }}
                    className="mt-2 text-xs font-medium text-green-700 hover:text-green-900"
                  >
                    Add another →
                  </button>
                </div>
              )}

              {showInviteForm && !inviteSuccess && (
                <form onSubmit={handleCreateAdmin} className="space-y-4 border border-[#E5E7EB] rounded-lg p-4" autoComplete="off">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Invite New Admin</p>

                  {inviteError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{inviteError}</div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">First Name <span className="text-red-500">*</span></label>
                      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Middle</label>
                      <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Last Name <span className="text-red-500">*</span></label>
                      <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="w-full px-3 py-2 pr-9 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          {showPassword
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                          }
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-1">Share this with the admin so they can log in immediately.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Designation</label>
                    <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Managing Partner" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={resetInviteForm} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={inviting} className="flex-1 px-4 py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
                      {inviting ? "Creating…" : "Create Admin"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#E5E7EB]">
              <button onClick={() => setAdminModal(null)} className="w-full px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Admin */}
      {confirmDeleteAdmin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Remove Admin?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              <strong>{confirmDeleteAdmin.name}</strong> will be permanently deleted and their login access removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAdmin(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
                Cancel
              </button>
              <button onClick={handleDeleteAdmin} disabled={!!deletingAdminId} className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                {deletingAdminId ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm SP Status Modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">
              {confirm.activate ? "Activate" : "Deactivate"} Service Provider?
            </h3>
            <p className="text-sm text-[#6B7280] mb-5">
              {confirm.activate
                ? `"${confirm.name}" and all its users will be activated.`
                : `"${confirm.name}" and all its users will be blocked from logging in.`}
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
