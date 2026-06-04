"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { createUser, UserInput } from "@/app/(sp)/users/actions";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1",  label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+61", label: "🇦🇺 +61" },
  { code: "+60", label: "🇲🇾 +60" },
];

const inp = "w-full px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";

function AvatarUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const supabase = createClient();
    const path = `user-avatars/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from("org-files").upload(path, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from("org-files").getPublicUrl(data.path);
      onChange(urlData.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="col-span-2 flex items-center gap-4 pb-4 border-b border-[#F3F4F6] mb-2">
      <div className="relative flex-shrink-0">
        {value ? (
          <Image src={value} alt="Avatar" width={64} height={64} className="w-16 h-16 rounded-full object-cover border-2 border-[#E5E7EB]" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#F3F4F6] border-2 border-dashed border-[#D1D5DB] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-[#6B7280] mb-1.5">Profile Photo</p>
        <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          {uploading ? "Uploading…" : value ? "Change Photo" : "Upload Photo"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
        {value && (
          <button type="button" onClick={() => onChange("")}
            className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
        )}
        <p className="text-xs text-[#9CA3AF] mt-1">JPG, PNG · shown in sidebar</p>
      </div>
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

interface Props {
  clientOrgs: { id: string; name: string }[];
}

export default function ClientUserForm({ clientOrgs }: Props) {
  const [form, setForm] = useState<UserInput>({
    first_name: "", middle_name: "", last_name: "",
    email: "",
    role: "client",
    mobile_country_code: "+91", mobile_number: "",
    date_of_birth: "",
    client_org_id: "",
    avatar_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof UserInput) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) { setError("First name is required."); return; }
    if (!form.last_name.trim()) { setError("Last name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (!form.client_org_id) { setError("Please select a client organisation."); return; }

    setSaving(true);
    setError(null);
    try {
      await createUser(form);
      window.location.href = "/users?tab=clients";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] mb-4 pb-3 border-b border-[#E5E7EB]">User Details</h2>
        <div className="grid grid-cols-2 gap-4">

          <AvatarUpload value={form.avatar_url ?? ""} onChange={set("avatar_url")} />

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

          <Field label="Mobile">
            <div className="flex gap-2">
              <div className="flex items-center border-2 border-[#4A6FA5] rounded-lg overflow-hidden flex-shrink-0 w-24 focus-within:ring-2 focus-within:ring-[#1E3A5F]">
                <span className="px-2 py-2 text-sm text-[#6B7280] bg-[#F3F4F6] border-r border-[#4A6FA5] select-none">+</span>
                <input type="text" inputMode="numeric"
                  value={(form.mobile_country_code ?? "+91").replace(/^\+/, "")}
                  onChange={(e) => set("mobile_country_code")("+" + e.target.value.replace(/\D/g, ""))}
                  placeholder="91"
                  className="w-full px-2 py-2 text-sm focus:outline-none bg-white" />
              </div>
              <input type="tel" value={form.mobile_number ?? ""} onChange={(e) => set("mobile_number")(e.target.value)}
                placeholder="10-digit number" className={inp} />
            </div>
          </Field>

          <Field label="Email" required>
            <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className={inp} />
          </Field>

          <Field label="Date of Birth">
            <input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth")(e.target.value)} className={inp} />
          </Field>

          <Field label="Client Organisation" required full>
            <select value={form.client_org_id ?? ""} onChange={(e) => set("client_org_id")(e.target.value)} className={inp}>
              <option value="">Select organisation…</option>
              {[...clientOrgs].sort((a, b) => a.name.localeCompare(b.name)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>

        </div>
      </section>

      <div className="flex gap-3">
        <button type="button" onClick={() => window.location.href = "/users?tab=clients"}
          className="px-5 py-2.5 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
          {saving ? "Sending invite…" : "Send Invite"}
        </button>
      </div>
    </form>
  );
}
