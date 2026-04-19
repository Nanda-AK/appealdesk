"use client";

import { useState } from "react";
import { createUser, UserInput } from "@/app/(sp)/users/actions";

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
    email: "", password: "",
    role: "client",
    mobile_country_code: "+91", mobile_number: "",
    date_of_birth: "",
    client_org_id: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof UserInput) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim()) { setError("First name is required."); return; }
    if (!form.last_name.trim()) { setError("Last name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== confirmPassword) { setError("Passwords do not match."); return; }
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] mb-4 pb-3 border-b border-[#E5E7EB]">User Details</h2>
        <div className="grid grid-cols-2 gap-4">

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
              <select value={form.mobile_country_code ?? "+91"} onChange={(e) => set("mobile_country_code")(e.target.value)}
                className="px-2 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-28 flex-shrink-0">
                {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
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

          <Field label="Confirm Password" required>
            <div className="relative">
              <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                className={`w-full px-3 py-2 pr-9 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] ${confirmPassword && confirmPassword !== form.password ? "border-red-400" : "border-[#E5E7EB]"}`} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {showConfirm
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                  }
                </svg>
              </button>
            </div>
            {confirmPassword && confirmPassword !== form.password && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </Field>

          <Field label="Client Organisation" required full>
            <select value={form.client_org_id ?? ""} onChange={(e) => set("client_org_id")(e.target.value)} className={inp}>
              <option value="">Select organisation…</option>
              {clientOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
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
          {saving ? "Creating…" : "Create Client User"}
        </button>
      </div>
    </form>
  );
}
