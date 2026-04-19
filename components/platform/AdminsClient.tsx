"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPlatformAdmin, toggleAdminStatus, AdminInput } from "@/app/(platform)/platform/admins/actions";

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

const emptyForm = (): AdminInput => ({
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "platform_admin",
  avatar_url: "",
});

export default function AdminsClient({ admins, currentUserId, isSuperAdmin }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AdminInput>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string; activate: boolean } | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true);
    const supabase = createClient();
    const path = `user-avatars/${Date.now()}-${file.name}`;
    const { data, error: uploadError } = await supabase.storage.from("org-files").upload(path, file, { upsert: true });
    if (!uploadError && data) {
      const { data: urlData } = supabase.storage.from("org-files").getPublicUrl(data.path);
      setForm((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
    }
    setAvatarUploading(false);
  }

  function updateForm(field: keyof AdminInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setError("All required fields must be filled.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPlatformAdmin(form);
      setShowModal(false);
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin.");
    } finally {
      setSaving(false);
    }
  }

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
            onClick={() => setShowModal(true)}
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-[#1A1A2E]">Add Platform Admin</h3>
              <button onClick={() => { setShowModal(false); setForm(emptyForm()); setError(null); }} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">{error}</div>}

              {/* Avatar upload */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#F3F4F6]">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-[#E5E7EB] flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#F3F4F6] border-2 border-dashed border-[#D1D5DB] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
                <div>
                  <label className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition ${avatarUploading ? "opacity-50 pointer-events-none" : ""}`}>
                    {avatarUploading ? "Uploading…" : form.avatar_url ? "Change Photo" : "Upload Photo"}
                    <input type="file" accept="image/*" className="hidden" disabled={avatarUploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
                  </label>
                  {form.avatar_url && (
                    <button type="button" onClick={() => setForm((p) => ({ ...p, avatar_url: "" }))}
                      className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">First Name <span className="text-red-500">*</span></label>
                  <input value={form.first_name} onChange={(e) => updateForm("first_name", e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Middle Name</label>
                  <input value={form.middle_name} onChange={(e) => updateForm("middle_name", e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input value={form.last_name} onChange={(e) => updateForm("last_name", e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => updateForm("password", e.target.value)} className="w-full px-3 py-2 pr-9 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {showPassword
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Role</label>
                <select value={form.role} onChange={(e) => updateForm("role", e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
                  <option value="platform_admin">Platform Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(emptyForm()); setError(null); }} className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
                  {saving ? "Creating…" : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
