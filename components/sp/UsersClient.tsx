"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createUser, toggleUserStatus, deleteUser, UserInput } from "@/app/(sp)/users/actions";

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

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1",  label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+60", label: "🇲🇾 +60" },
];

const inp = "w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";

function fullName(u: { first_name: string; middle_name: string | null; last_name: string }) {
  return [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-2 border-t border-[#F3F4F6] pt-4 mt-1">
      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">{children}</p>
    </div>
  );
}

function Field({ label, required, children, full }: { label: string; required?: boolean; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function FileUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    const path = `user-docs/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("org-files").upload(path, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from("org-files").getPublicUrl(data.path);
      onChange(urlData.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">{label} (Attachment)</label>
      {value ? (
        <div className="flex items-center gap-2">
          <a href={value} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#4A6FA5] hover:underline truncate max-w-[180px]">
            View uploaded file
          </a>
          <button type="button" onClick={() => onChange("")}
            className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
      ) : (
        <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {uploading ? "Uploading…" : "Upload File"}
          <input type="file" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      )}
    </div>
  );
}

const BLANK: UserInput = {
  first_name: "", middle_name: "", last_name: "",
  email: "", password: "",
  role: "sp_staff",
  mobile_country_code: "+91", mobile_number: "",
  date_of_birth: "",
  department: "", designation: "",
  date_of_joining: "", date_of_leaving: "",
  address_line1: "", address_line2: "", city: "", pin_code: "", location: "",
  pan_number: "", pan_attachment: "",
  aadhar_number: "", aadhar_attachment: "",
  client_org_id: "",
};

export default function UsersClient({ users, clientOrgs, currentUserId, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<"team" | "clients">("team");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<UserInput>(BLANK);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const set = (field: keyof UserInput) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const isSpRole = form.role !== "client";

  const teamUsers = users.filter((u) => u.role === "sp_admin" || u.role === "sp_staff");
  const clientUsers = users.filter((u) => u.role === "client");

  function resetAndOpen() {
    setForm(BLANK);
    setShowPassword(false);
    setCreateError(null);
    setShowCreateModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) { setCreateError("First name is required."); return; }
    if (!form.last_name.trim()) { setCreateError("Last name is required."); return; }
    if (!form.email.trim()) { setCreateError("Email is required."); return; }
    if (form.password.length < 8) { setCreateError("Password must be at least 8 characters."); return; }
    if (form.role === "client" && !form.client_org_id) { setCreateError("Please select a client organisation."); return; }

    setCreating(true); setCreateError(null);
    try {
      await createUser(form);
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user.");
      setCreating(false);
    }
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
              {tab === "team" ? `Team (${teamUsers.length})` : `Client Users (${clientUsers.length})`}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button onClick={resetAndOpen}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        )}
      </div>

      <UserTable list={activeTab === "team" ? teamUsers : clientUsers} />

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E5E7EB] w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-semibold text-[#1A1A2E]">Add User</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">

                {createError && (
                  <div className="col-span-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{createError}</div>
                )}

                {/* ── Basic Info ── */}
                <SectionLabel>Basic Information</SectionLabel>

                {/* Name — 3 cols across full width */}
                <div className="col-span-2 grid grid-cols-3 gap-3">
                  <Field label="First Name" required>
                    <input value={form.first_name} onChange={(e) => set("first_name")(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Middle Name">
                    <input value={form.middle_name ?? ""} onChange={(e) => set("middle_name")(e.target.value)} placeholder="Optional" className={inp} />
                  </Field>
                  <Field label="Last Name" required>
                    <input value={form.last_name} onChange={(e) => set("last_name")(e.target.value)} className={inp} />
                  </Field>
                </div>

                {/* Mobile */}
                <Field label="Mobile" required={false}>
                  <div className="flex gap-2">
                    <select value={form.mobile_country_code ?? "+91"} onChange={(e) => set("mobile_country_code")(e.target.value)}
                      className="px-2 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-28 flex-shrink-0">
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                    <input type="tel" value={form.mobile_number ?? ""} onChange={(e) => set("mobile_number")(e.target.value)}
                      placeholder="10-digit number" className={inp} />
                  </div>
                </Field>

                {/* Email */}
                <Field label="Email" required>
                  <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className={inp} />
                </Field>

                {/* Date of Birth */}
                <Field label="Date of Birth">
                  <input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth")(e.target.value)} className={inp} />
                </Field>

                {/* Password */}
                <Field label="Password" required>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={form.password}
                      onChange={(e) => set("password")(e.target.value)} placeholder="Min. 8 characters"
                      className="w-full px-3 py-2 pr-9 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {showPassword
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                        }
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[#9CA3AF] mt-1">Share with user so they can log in immediately.</p>
                </Field>

                {/* Role */}
                <Field label="Role" required>
                  <select value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserInput["role"], client_org_id: "" }))}
                    className={inp}>
                    <option value="sp_admin">Admin</option>
                    <option value="sp_staff">Staff</option>
                    <option value="client">Client User</option>
                  </select>
                </Field>

                {/* Client org */}
                {!isSpRole && (
                  <Field label="Client Organisation" required full>
                    <select value={form.client_org_id ?? ""} onChange={(e) => set("client_org_id")(e.target.value)} className={inp}>
                      <option value="">Select organisation…</option>
                      {clientOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </Field>
                )}

                {/* ── SP Admin/Staff only fields ── */}
                {isSpRole && (
                  <>
                    <SectionLabel>Employment Details</SectionLabel>

                    <Field label="Department">
                      <input value={form.department ?? ""} onChange={(e) => set("department")(e.target.value)} placeholder="e.g. Tax, Audit" className={inp} />
                    </Field>
                    <Field label="Designation">
                      <input value={form.designation ?? ""} onChange={(e) => set("designation")(e.target.value)} placeholder="e.g. CA, Manager" className={inp} />
                    </Field>
                    <Field label="Date of Joining">
                      <input type="date" value={form.date_of_joining ?? ""} onChange={(e) => set("date_of_joining")(e.target.value)} className={inp} />
                    </Field>
                    <Field label="Date of Leaving">
                      <input type="date" value={form.date_of_leaving ?? ""} onChange={(e) => set("date_of_leaving")(e.target.value)} className={inp} />
                    </Field>

                    <SectionLabel>Address</SectionLabel>

                    <Field label="Address Line 1" full>
                      <input value={form.address_line1 ?? ""} onChange={(e) => set("address_line1")(e.target.value)} placeholder="Street / Building" className={inp} />
                    </Field>
                    <Field label="Address Line 2" full>
                      <input value={form.address_line2 ?? ""} onChange={(e) => set("address_line2")(e.target.value)} placeholder="Area / Landmark" className={inp} />
                    </Field>
                    <Field label="City">
                      <input value={form.city ?? ""} onChange={(e) => set("city")(e.target.value)} className={inp} />
                    </Field>
                    <Field label="PIN Code">
                      <input value={form.pin_code ?? ""} onChange={(e) => set("pin_code")(e.target.value)} maxLength={10} className={inp} />
                    </Field>
                    <Field label="Location / State" full>
                      <input value={form.location ?? ""} onChange={(e) => set("location")(e.target.value)} placeholder="e.g. Tamil Nadu" className={inp} />
                    </Field>

                    <SectionLabel>Identity Documents</SectionLabel>

                    <Field label="PAN Number">
                      <input value={form.pan_number ?? ""} onChange={(e) => set("pan_number")(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F" maxLength={10} className={inp} />
                    </Field>
                    <FileUploadField label="PAN" value={form.pan_attachment ?? ""} onChange={set("pan_attachment")} />

                    <Field label="Aadhar Number">
                      <input value={form.aadhar_number ?? ""} onChange={(e) => set("aadhar_number")(e.target.value)}
                        placeholder="XXXX XXXX XXXX" maxLength={14} className={inp} />
                    </Field>
                    <FileUploadField label="Aadhar" value={form.aadhar_attachment ?? ""} onChange={set("aadhar_attachment")} />
                  </>
                )}

              </div>

              <div className="flex gap-3 pt-6 mt-2 border-t border-[#F3F4F6]">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
