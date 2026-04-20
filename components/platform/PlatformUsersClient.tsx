"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleAdminStatus } from "@/app/(platform)/platform/admins/actions";
import { toggleSpAdminStatus, deletePlatformSpAdmin } from "@/app/(platform)/platform/users/actions";

interface PlatformUser {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SpAdmin {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  designation: string | null;
  is_active: boolean;
  created_at: string;
  org_id: string;
  organization: { id: string; name: string } | null;
}

interface Props {
  platformUsers: PlatformUser[];
  spAdmins: SpAdmin[];
  currentUserId: string;
  isSuperAdmin: boolean;
  isPlatformAdmin?: boolean;
}

function fullName(u: { first_name: string; middle_name?: string | null; last_name: string }) {
  return [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
}

const HEADER = "bg-[#D1D9E6] border-b-2 border-[#B0BDD0]";
const TH = "text-left px-4 py-3 font-medium text-[#1A1A2E]";
const TH_C = "text-center px-4 py-3 font-medium text-[#1A1A2E] w-10";

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-sm w-full">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
      />
    </div>
  );
}

function SortIcon({ asc }: { asc: boolean }) {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {asc
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      }
    </svg>
  );
}

export default function PlatformUsersClient({ platformUsers, spAdmins, currentUserId, isSuperAdmin, isPlatformAdmin }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"platform" | "sp">("platform");

  // Platform users state
  const [pSearch, setPSearch] = useState("");
  const [pSortAsc, setPSortAsc] = useState(true);
  const [pToggling, setPToggling] = useState<string | null>(null);
  const [pConfirm, setPConfirm] = useState<{ id: string; name: string; activate: boolean } | null>(null);

  // SP admins state
  const [sSearch, setSSearch] = useState("");
  const [sSortAsc, setSSortAsc] = useState(true);
  const [sToggling, setSToggling] = useState<string | null>(null);
  const [sConfirmToggle, setSConfirmToggle] = useState<{ id: string; name: string; activate: boolean } | null>(null);
  const [sConfirmDelete, setSConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [sDeleting, setSDeleting] = useState<string | null>(null);

  // ── Platform users filtering
  const pq = pSearch.toLowerCase();
  const filteredPlatform = platformUsers
    .filter((u) => {
      const name = fullName(u).toLowerCase();
      const role = u.role === "super_admin" ? "super admin" : "platform admin";
      const status = u.is_active ? "active" : "inactive";
      return name.includes(pq) || u.email.toLowerCase().includes(pq) || role.includes(pq) || status.includes(pq);
    })
    .sort((a, b) => {
      const na = fullName(a), nb = fullName(b);
      return pSortAsc ? na.localeCompare(nb) : nb.localeCompare(na);
    });

  // ── SP admins filtering
  const sq = sSearch.toLowerCase();
  const filteredSp = spAdmins
    .filter((u) => {
      const name = fullName(u).toLowerCase();
      const sp = (u.organization?.name ?? "").toLowerCase();
      const status = u.is_active ? "active" : "inactive";
      return (
        name.includes(sq) ||
        u.email.toLowerCase().includes(sq) ||
        sp.includes(sq) ||
        (u.designation ?? "").toLowerCase().includes(sq) ||
        status.includes(sq)
      );
    })
    .sort((a, b) => {
      const na = fullName(a), nb = fullName(b);
      return sSortAsc ? na.localeCompare(nb) : nb.localeCompare(na);
    });

  // ── Handlers
  async function handlePlatformToggle() {
    if (!pConfirm) return;
    setPToggling(pConfirm.id);
    try { await toggleAdminStatus(pConfirm.id, pConfirm.activate); }
    finally { setPToggling(null); setPConfirm(null); }
  }

  async function handleSpToggle() {
    if (!sConfirmToggle) return;
    setSToggling(sConfirmToggle.id);
    try { await toggleSpAdminStatus(sConfirmToggle.id, sConfirmToggle.activate); }
    finally { setSToggling(null); setSConfirmToggle(null); }
  }

  async function handleSpDelete() {
    if (!sConfirmDelete) return;
    setSDeleting(sConfirmDelete.id);
    try { await deletePlatformSpAdmin(sConfirmDelete.id); setSConfirmDelete(null); }
    finally { setSDeleting(null); }
  }

  return (
    <>
      {/* Tabs + Add button */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-sm">
          {([["platform", "Platform Users"], ["sp", "SP Users"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === key ? "bg-[#1E3A5F] text-white" : "text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F8F9FA]"}`}>
              {label}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                {key === "platform" ? platformUsers.length : spAdmins.length}
              </span>
            </button>
          ))}
        </div>
        {(isSuperAdmin || (isPlatformAdmin && activeTab === "sp")) && (
          <button
            onClick={() => router.push(activeTab === "platform" ? "/platform/users/new-platform" : "/platform/users/new-sp")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {activeTab === "platform" ? "Add Platform User" : "Add SP User"}
          </button>
        )}
      </div>

      {/* ── PLATFORM USERS TAB ── */}
      {activeTab === "platform" && (
        <>
          <div className="mb-4">
            <SearchBar value={pSearch} onChange={setPSearch} placeholder="Search platform users…" />
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className={HEADER}>
                  <th className={TH_C}>#</th>
                  <th className={TH}>
                    <button onClick={() => setPSortAsc(!pSortAsc)} className="inline-flex items-center gap-1 hover:text-[#1E3A5F] transition-colors">
                      Name <SortIcon asc={pSortAsc} />
                    </button>
                  </th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Role</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Added</th>
                  {isSuperAdmin && <th className={TH}>Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredPlatform.length === 0 ? (
                  <tr><td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-12 text-center text-[#6B7280]">
                    {pSearch ? `No results for "${pSearch}"` : "No platform users found."}
                  </td></tr>
                ) : filteredPlatform.map((u, i) => {
                  const name = fullName(u);
                  const isMe = u.id === currentUserId;
                  return (
                    <tr key={u.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                      <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E]">
                        {name} {isMe && <span className="text-xs text-[#9CA3AF]">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "super_admin" ? "bg-[#EEF2FF] text-[#4A6FA5]" : "bg-gray-100 text-gray-700"}`}>
                          {u.role === "super_admin" ? "Super Admin" : "Platform Admin"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          {!isMe && (
                            <button
                              onClick={() => setPConfirm({ id: u.id, name, activate: !u.is_active })}
                              disabled={pToggling === u.id}
                              className={`text-xs font-medium disabled:opacity-50 ${u.is_active ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}`}>
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── SP USERS TAB ── */}
      {activeTab === "sp" && (
        <>
          <div className="mb-4">
            <SearchBar value={sSearch} onChange={setSSearch} placeholder="Search SP users…" />
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className={HEADER}>
                  <th className={TH_C}>#</th>
                  <th className={TH}>
                    <button onClick={() => setSSortAsc(!sSortAsc)} className="inline-flex items-center gap-1 hover:text-[#1E3A5F] transition-colors">
                      Name <SortIcon asc={sSortAsc} />
                    </button>
                  </th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Service Provider</th>
                  <th className={TH}>Designation</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Added</th>
                  {isSuperAdmin && <th className={TH}>Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredSp.length === 0 ? (
                  <tr><td colSpan={isSuperAdmin ? 8 : 7} className="px-4 py-12 text-center text-[#6B7280]">
                    {sSearch ? `No results for "${sSearch}"` : "No SP admin users found."}
                  </td></tr>
                ) : filteredSp.map((u, i) => {
                  const name = fullName(u);
                  return (
                    <tr key={u.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                      <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-[#1A1A2E]">{name}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{u.email}</td>
                      <td className="px-4 py-3 text-[#6B7280] font-medium">{u.organization?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{u.designation ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSConfirmToggle({ id: u.id, name, activate: !u.is_active })}
                              disabled={sToggling === u.id}
                              className={`text-xs font-medium disabled:opacity-50 ${u.is_active ? "text-amber-600 hover:text-amber-800" : "text-green-600 hover:text-green-800"}`}>
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => setSConfirmDelete({ id: u.id, name })}
                              className="text-xs font-medium text-red-500 hover:text-red-700">
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Confirm platform user toggle ── */}
      {pConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">{pConfirm.activate ? "Activate" : "Deactivate"} User?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              {pConfirm.activate ? `"${pConfirm.name}" will be able to log in again.` : `"${pConfirm.name}" will be blocked from logging in.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPConfirm(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
              <button onClick={handlePlatformToggle} disabled={!!pToggling}
                className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition disabled:opacity-60 ${pConfirm.activate ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                {pToggling ? "Processing…" : pConfirm.activate ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm SP admin toggle ── */}
      {sConfirmToggle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">{sConfirmToggle.activate ? "Activate" : "Deactivate"} SP User?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              {sConfirmToggle.activate ? `"${sConfirmToggle.name}" will be able to log in again.` : `"${sConfirmToggle.name}" will be blocked from logging in.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setSConfirmToggle(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
              <button onClick={handleSpToggle} disabled={!!sToggling}
                className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition disabled:opacity-60 ${sConfirmToggle.activate ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                {sToggling ? "Processing…" : sConfirmToggle.activate ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm SP admin delete ── */}
      {sConfirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">Delete SP User?</h3>
            <p className="text-sm text-[#6B7280] mb-2">
              <strong>{sConfirmDelete.name}</strong> will be permanently deleted and lose all access.
            </p>
            <p className="text-xs text-red-600 font-medium mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setSConfirmDelete(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
              <button onClick={handleSpDelete} disabled={!!sDeleting}
                className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-60">
                {sDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
