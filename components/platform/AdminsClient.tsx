"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleAdminStatus } from "@/app/(platform)/platform/admins/actions";

interface Admin {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  admins: Admin[];
  currentUserId: string;
  isSuperAdmin: boolean;
}

export default function AdminsClient({ admins, currentUserId, isSuperAdmin }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; activate: boolean } | null>(null);

  const q = search.toLowerCase();
  const filtered = admins
    .filter((a) => {
      const fullName = [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(" ");
      const role = a.role === "super_admin" ? "super admin" : "platform admin";
      const status = a.is_active ? "active" : "inactive";
      return (
        fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        role.includes(q) ||
        status.includes(q)
      );
    })
    .sort((a, b) => {
      const nameA = [a.first_name, a.last_name].join(" ");
      const nameB = [b.first_name, b.last_name].join(" ");
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  async function handleToggle() {
    if (!confirm) return;
    setToggling(confirm.id);
    try {
      await toggleAdminStatus(confirm.id, confirm.activate);
    } finally {
      setToggling(null);
      setConfirm(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins…"
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] bg-white"
          />
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => router.push("/platform/admins/new")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Platform Admin
          </button>
        )}
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
                    {sortAsc
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    }
                  </svg>
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Email</th>
              <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Role</th>
              <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Added</th>
              {isSuperAdmin && <th className="text-left px-4 py-3 font-medium text-[#1A1A2E]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-12 text-center text-[#6B7280]">
                  {search ? `No results for "${search}"` : "No platform admins found."}
                </td>
              </tr>
            ) : (
              filtered.map((admin, i) => {
                const fullName = [admin.first_name, admin.middle_name, admin.last_name].filter(Boolean).join(" ");
                const isMe = admin.id === currentUserId;
                return (
                  <tr key={admin.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                    <td className="px-4 py-3 text-center text-[#9CA3AF] text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-[#1A1A2E]">
                      {fullName} {isMe && <span className="text-xs text-[#9CA3AF]">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{admin.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        admin.role === "super_admin" ? "bg-[#EEF2FF] text-[#4A6FA5]" : "bg-gray-100 text-gray-700"
                      }`}>
                        {admin.role === "super_admin" ? "Super Admin" : "Platform Admin"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${admin.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {admin.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {new Date(admin.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        {!isMe && (
                          <button
                            onClick={() => setConfirm({ id: admin.id, name: fullName, activate: !admin.is_active })}
                            disabled={toggling === admin.id}
                            className={`text-xs font-medium disabled:opacity-50 ${admin.is_active ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}`}
                          >
                            {admin.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm toggle */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-[#1A1A2E] mb-2">{confirm.activate ? "Activate" : "Deactivate"} Admin?</h3>
            <p className="text-sm text-[#6B7280] mb-5">
              {confirm.activate ? `"${confirm.name}" will be able to log in again.` : `"${confirm.name}" will be blocked from logging in.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
              <button onClick={handleToggle} disabled={!!toggling} className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition disabled:opacity-60 ${confirm.activate ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                {toggling ? "Processing…" : confirm.activate ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
