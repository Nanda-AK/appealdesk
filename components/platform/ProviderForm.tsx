"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createProvider, updateProvider, ComplianceInput } from "@/app/(platform)/platform/providers/actions";

const BUSINESS_TYPES = ["Company", "Trust", "Partnership", "LLP", "Sole Proprietorship", "OPC", "Custom"];
const COMPLIANCE_TYPES = [
  { key: "pan", label: "PAN" },
  { key: "aadhaar", label: "Aadhaar" },
  { key: "tan", label: "TAN" },
  { key: "gst", label: "GST" },
] as const;

interface InitialCompliance {
  type: string;
  number?: string;
  login_id?: string;
  credential?: string;
  attachment_url?: string;
}

interface Props {
  mode: "create" | "edit";
  providerId?: string;
  initialData?: Record<string, string | null>;
  initialCompliance?: InitialCompliance[];
}

interface ComplianceState {
  number: string;
  login_id: string;
  credential: string;
  attachment_url: string;
  showCredential: boolean;
  uploading: boolean;
}

const defaultCompliance = (): ComplianceState => ({
  number: "",
  login_id: "",
  credential: "",
  attachment_url: "",
  showCredential: false,
  uploading: false,
});

export default function ProviderForm({ mode, providerId, initialData, initialCompliance }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? "");
  const [businessType, setBusinessType] = useState(initialData?.business_type ?? "");
  const [dateOfIncorporation, setDateOfIncorporation] = useState(initialData?.date_of_incorporation ?? "");
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [address1, setAddress1] = useState(initialData?.address_line1 ?? "");
  const [address2, setAddress2] = useState(initialData?.address_line2 ?? "");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [state, setState] = useState(initialData?.state ?? "");
  const [pinCode, setPinCode] = useState(initialData?.pin_code ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compliance state per type
  const [compliance, setCompliance] = useState<Record<string, ComplianceState>>(() => {
    const init: Record<string, ComplianceState> = {};
    COMPLIANCE_TYPES.forEach(({ key }) => {
      const existing = initialCompliance?.find((c) => c.type === key);
      init[key] = {
        number: existing?.number ?? "",
        login_id: existing?.login_id ?? "",
        credential: existing?.credential ?? "",
        attachment_url: existing?.attachment_url ?? "",
        showCredential: false,
        uploading: false,
      };
    });
    return init;
  });

  function updateCompliance(type: string, field: keyof ComplianceState, value: string | boolean) {
    setCompliance((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("org-files")
      .upload(path, file, { upsert: true });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("org-files").getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await uploadFile(file, `logos/${Date.now()}-${file.name}`);
    if (url) setLogoUrl(url);
    setLogoUploading(false);
  }

  async function handleAttachmentUpload(type: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    updateCompliance(type, "uploading", true);
    const url = await uploadFile(file, `compliance/${type}/${Date.now()}-${file.name}`);
    if (url) updateCompliance(type, "attachment_url", url);
    updateCompliance(type, "uploading", false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Service Provider name is required."); return; }
    if (!businessType) { setError("Business type is required."); return; }
    if (!dateOfIncorporation) { setError("Date of incorporation is required."); return; }

    setSaving(true);
    setError(null);

    const complianceInput: ComplianceInput[] = COMPLIANCE_TYPES.map(({ key }) => ({
      type: key,
      number: compliance[key].number || undefined,
      login_id: compliance[key].login_id || undefined,
      credential: compliance[key].credential || undefined,
      attachment_url: compliance[key].attachment_url || undefined,
    }));

    try {
      if (mode === "create") {
        await createProvider({ name, business_type: businessType, date_of_incorporation: dateOfIncorporation, logo_url: logoUrl || undefined, address_line1: address1 || undefined, address_line2: address2 || undefined, city: city || undefined, state: state || undefined, pin_code: pinCode || undefined, compliance: complianceInput });
      } else {
        await updateProvider(providerId!, { name, business_type: businessType, date_of_incorporation: dateOfIncorporation, logo_url: logoUrl || undefined, address_line1: address1 || undefined, address_line2: address2 || undefined, city: city || undefined, state: state || undefined, pin_code: pinCode || undefined, compliance: complianceInput });
      }
      router.push("/platform/providers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Basic Information */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] mb-4 pb-3 border-b border-[#E5E7EB]">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Service Provider Name <span className="text-red-500">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Service provider name" autoComplete="off" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Business Type <span className="text-red-500">*</span></label>
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]">
              <option value="">Select type</option>
              {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Date of Incorporation <span className="text-red-500">*</span></label>
            <input type="date" value={dateOfIncorporation} onChange={(e) => setDateOfIncorporation(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Logo <span className="text-[#9CA3AF]">(JPG/PNG, max 2MB)</span></label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-[#E5E7EB]" />
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] mb-4 pb-3 border-b border-[#E5E7EB]">Address</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Address Line 1 <span className="text-[#9CA3AF]">(Building, Road)</span></label>
            <input value={address1} onChange={(e) => setAddress1(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Address Line 2 <span className="text-[#9CA3AF]">(Area, Locality)</span></label>
            <input value={address2} onChange={(e) => setAddress2(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">State</label>
            <input value={state} onChange={(e) => setState(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">PIN Code</label>
            <input value={pinCode} onChange={(e) => setPinCode(e.target.value)} maxLength={6} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
          </div>
        </div>
      </section>

      {/* Compliance Details */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] mb-1 pb-3 border-b border-[#E5E7EB]">
          Compliance Details <span className="text-[#9CA3AF] font-normal">(Optional)</span>
        </h2>
        <div className="space-y-4 mt-4">
          {COMPLIANCE_TYPES.map(({ key, label }) => (
            <details key={key} className="border border-[#E5E7EB] rounded-lg">
              <summary className="px-4 py-3 text-sm font-medium text-[#1A1A2E] cursor-pointer select-none flex items-center justify-between">
                <span>{label}</span>
                {compliance[key].number && (
                  <span className="text-xs text-[#6B7280] font-normal">{compliance[key].number}</span>
                )}
              </summary>
              <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t border-[#E5E7EB] pt-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">{label} Number</label>
                  <input value={compliance[key].number} onChange={(e) => updateCompliance(key, "number", e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Login ID</label>
                  <input value={compliance[key].login_id} onChange={(e) => updateCompliance(key, "login_id", e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={compliance[key].showCredential ? "text" : "password"}
                      value={compliance[key].credential}
                      onChange={(e) => updateCompliance(key, "credential", e.target.value)}
                      className="w-full px-3 py-2 pr-9 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                    <button type="button" onClick={() => updateCompliance(key, "showCredential", !compliance[key].showCredential)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {compliance[key].showCredential
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B7280] mb-1">Attachment <span className="text-[#9CA3AF]">(PDF/JPG/PNG)</span></label>
                  <div className="flex items-center gap-2">
                    {compliance[key].attachment_url && (
                      <a href={compliance[key].attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4A6FA5] hover:underline truncate max-w-[100px]">View file</a>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1.5 text-xs border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition">
                      {compliance[key].uploading ? "Uploading…" : compliance[key].attachment_url ? "Change" : "Upload"}
                      <input type="file" accept=".pdf,image/jpeg,image/png" className="hidden" onChange={(e) => handleAttachmentUpload(key, e)} disabled={compliance[key].uploading} />
                    </label>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/platform/providers")}
          className="px-5 py-2.5 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60"
        >
          {saving ? "Saving…" : mode === "create" ? "Add Service Provider" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
