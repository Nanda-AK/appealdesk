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
  const [toggling, setToggling] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; activate: boolean } | null>(null);

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
      <div className="flex justify-end mb-4">
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
            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Name</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Email</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Role</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Added</th>
              {isSuperAdmin && <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#6B7280]">No platform admins found.</td>
              </tr>
            ) : (
              admins.map((admin, i) => {
                const fullName = [admin.first_name, admin.middle_name, admin.last_name].filter(Boolean).join(" ");
                const isMe = admin.id === currentUserId;
                return (
                  <tr key={admin.id} className={`hover:bg-[#F8F9FA] transition-colors ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
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
