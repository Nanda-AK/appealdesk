"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateSpProfile, saveSpCompliance, ComplianceInput } from "@/app/(sp)/settings/actions";
import { INDIAN_STATES } from "@/lib/constants";

const BUSINESS_TYPES = ["Company", "Trust", "Partnership", "LLP", "Sole Proprietorship", "OPC", "HUF", "Individual", "Custom"];
const FIXED_TYPES = ["pan", "aadhaar", "tan", "gst"];
const COMPLIANCE_TYPES = [
  { key: "pan", label: "PAN" },
  { key: "aadhaar", label: "Aadhaar" },
  { key: "tan", label: "TAN" },
  { key: "gst", label: "GST" },
] as const;
const EXTRA_ID_TYPES = [
  "GST", "MSME / Udyam", "ESIC", "EPF / PF", "Professional Tax",
  "Shops & Establishment", "IEC", "FSSAI", "Trade License",
  "Passport", "Driving Licence", "Voter ID", "Other",
];

interface ComplianceRow {
  type: string;
  number?: string | null;
  login_id?: string | null;
  credential?: string | null;
  attachment_url?: string | null;
}

interface Props {
  org: Record<string, string | null> | null;
  compliance: ComplianceRow[];
  isAdmin: boolean;
}

interface ComplianceState {
  number: string;
  login_id: string;
  credential: string;
  attachment_url: string;
  showCredential: boolean;
  uploading: boolean;
}

interface ExtraRow {
  rowId: string;
  type: string;
  number: string;
  login_id: string;
  credential: string;
  attachment_url: string;
  showCredential: boolean;
  uploading: boolean;
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {visible ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      )}
    </svg>
  );
}

export default function SpSettingsClient({ org, compliance, isAdmin }: Props) {
  const ro = !isAdmin; // read-only for non-admins
  const fieldClass = `w-full px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] ${ro ? "bg-[#F8F9FA] text-[#6B7280] cursor-not-allowed" : ""}`;

  // Profile state
  const [name, setName] = useState(org?.name ?? "");
  const [businessType, setBusinessType] = useState(org?.business_type ?? "");
  const [dateOfIncorporation, setDateOfIncorporation] = useState(org?.date_of_incorporation ?? "");
  const [logoUrl, setLogoUrl] = useState(org?.logo_url ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [address1, setAddress1] = useState(org?.address_line1 ?? "");
  const [address2, setAddress2] = useState(org?.address_line2 ?? "");
  const [city, setCity] = useState(org?.city ?? "");
  const [state, setState] = useState(org?.state ?? "");
  const [pinCode, setPinCode] = useState(org?.pin_code ?? "");
  const [country, setCountry] = useState(org?.country ?? "India");
  const [stateOther, setStateOther] = useState(
    !INDIAN_STATES.includes(org?.state ?? "") && (org?.state ?? "") !== ""
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Fixed compliance state
  const [complianceState, setComplianceState] = useState<Record<string, ComplianceState>>(() => {
    const init: Record<string, ComplianceState> = {};
    COMPLIANCE_TYPES.forEach(({ key }) => {
      const existing = compliance.find((c) => c.type === key);
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

  // Extra compliance rows
  const [extraRows, setExtraRows] = useState<ExtraRow[]>(() =>
    compliance
      .filter((c) => !FIXED_TYPES.includes(c.type))
      .map((c) => ({
        rowId: crypto.randomUUID(),
        type: c.type,
        number: c.number ?? "",
        login_id: c.login_id ?? "",
        credential: c.credential ?? "",
        attachment_url: c.attachment_url ?? "",
        showCredential: false,
        uploading: false,
      }))
  );

  function updateCompliance(type: string, field: keyof ComplianceState, value: string | boolean) {
    setComplianceState((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  }

  function addExtraRow() {
    setExtraRows((prev) => [
      ...prev,
      { rowId: crypto.randomUUID(), type: EXTRA_ID_TYPES[0], number: "", login_id: "", credential: "", attachment_url: "", showCredential: false, uploading: false },
    ]);
  }

  function updateExtraRow(rowId: string, field: keyof ExtraRow, value: string | boolean) {
    setExtraRows((prev) => prev.map((r) => r.rowId === rowId ? { ...r, [field]: value } : r));
  }

  function removeExtraRow(rowId: string) {
    setExtraRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("org-files").upload(path, file, { upsert: true });
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

  async function handleExtraAttachmentUpload(rowId: string, type: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    updateExtraRow(rowId, "uploading", true);
    const url = await uploadFile(file, `compliance/${type.replace(/\s+/g, "_")}/${Date.now()}-${file.name}`);
    if (url) updateExtraRow(rowId, "attachment_url", url);
    updateExtraRow(rowId, "uploading", false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setProfileError("Organisation name is required."); return; }
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await updateSpProfile({
        name,
        business_type: businessType || undefined,
        date_of_incorporation: dateOfIncorporation || undefined,
        logo_url: logoUrl || undefined,
        address_line1: address1 || undefined,
        address_line2: address2 || undefined,
        city: city || undefined,
        state: state || undefined,
        pin_code: pinCode || undefined,
        country: country || undefined,
      });

      // Save compliance details
      const complianceInput: ComplianceInput[] = [
        ...COMPLIANCE_TYPES.map(({ key }) => ({
          type: key,
          number: complianceState[key].number || undefined,
          login_id: complianceState[key].login_id || undefined,
          credential: complianceState[key].credential || undefined,
          attachment_url: complianceState[key].attachment_url || undefined,
        })),
        ...extraRows.map((r) => ({
          type: r.type,
          number: r.number || undefined,
          login_id: r.login_id || undefined,
          credential: r.credential || undefined,
          attachment_url: r.attachment_url || undefined,
        })),
      ];
      await saveSpCompliance(complianceInput);

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setProfileSaving(false);
    }
  }

  const cellInp = `w-full px-2.5 py-1.5 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] ${ro ? "bg-[#F8F9FA] text-[#6B7280] cursor-not-allowed" : ""}`;

  return (
    <div className="space-y-6">

      {/* ── Organisation Profile ── */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] pb-3 border-b border-[#E5E7EB] mb-4 flex items-center justify-between">
          Organisation Profile
          {ro && <span className="text-xs font-normal text-[#9CA3AF]">Read-only</span>}
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4" autoComplete="off">
          <div className="max-w-2xl space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-2">Logo <span className="text-[#9CA3AF]">(JPG/PNG, max 2MB)</span></label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-[#E5E7EB]" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#1E3A5F] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">{name.charAt(0).toUpperCase() || "S"}</span>
                </div>
              )}
              {!ro && (
                <div className="space-y-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                  {logoUrl && (
                    <button type="button" onClick={() => setLogoUrl("")} className="text-xs text-red-500 hover:text-red-700 pl-1">Remove</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Name + Business Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Organisation Name <span className="text-red-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={ro} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Business Type</label>
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} disabled={ro} className={fieldClass}>
                <option value="">Select type</option>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Date of Incorporation</label>
              <input type="date" value={dateOfIncorporation} onChange={(e) => setDateOfIncorporation(e.target.value)} disabled={ro} className={fieldClass} />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Address Line 1</label>
              <input value={address1} onChange={(e) => setAddress1(e.target.value)} disabled={ro} className={fieldClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Address Line 2</label>
              <input value={address2} onChange={(e) => setAddress2(e.target.value)} disabled={ro} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} disabled={ro} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">State</label>
              <select
                value={stateOther ? "Other" : state}
                onChange={(e) => {
                  if (e.target.value === "Other") { setStateOther(true); setState(""); }
                  else { setStateOther(false); setState(e.target.value); }
                }}
                disabled={ro}
                className={fieldClass}
              >
                <option value="">Select state / UT</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="Other">Other (specify)</option>
              </select>
              {stateOther && (
                <input value={state} onChange={(e) => setState(e.target.value)} disabled={ro} placeholder="Enter state / UT name" className={`${fieldClass} mt-2`} />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">PIN Code</label>
              <input value={pinCode} onChange={(e) => setPinCode(e.target.value)} maxLength={6} disabled={ro} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Country</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} disabled={ro} className={fieldClass} />
            </div>
          </div>

          </div>{/* end max-w-2xl */}

          {/* Compliance table */}
          <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8F9FA] border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Compliance Details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-white">
                    <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap w-36">ID Type</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B7280] min-w-[180px]">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B7280] min-w-[180px]">Login ID</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B7280] min-w-[180px]">Password</th>
                    <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-36">Attachment</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {/* Fixed rows */}
                  {COMPLIANCE_TYPES.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-medium text-[#1A1A2E] whitespace-nowrap">{label}</td>
                      <td className="px-4 py-3">
                        <input value={complianceState[key].number} onChange={(e) => updateCompliance(key, "number", e.target.value)} disabled={ro} placeholder={`${label} number`} className={cellInp} />
                      </td>
                      <td className="px-4 py-3">
                        <input value={complianceState[key].login_id} onChange={(e) => updateCompliance(key, "login_id", e.target.value)} disabled={ro} placeholder="Login ID" className={cellInp} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <input type={complianceState[key].showCredential ? "text" : "password"} value={complianceState[key].credential} onChange={(e) => updateCompliance(key, "credential", e.target.value)} disabled={ro} placeholder="Password" autoComplete="new-password" className={`${cellInp} pr-8`} />
                          <button type="button" onClick={() => updateCompliance(key, "showCredential", !complianceState[key].showCredential)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                            <EyeIcon visible={complianceState[key].showCredential} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {complianceState[key].attachment_url && (
                            <a href={complianceState[key].attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#4A6FA5] hover:underline">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </a>
                          )}
                          {!ro && (
                            <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition whitespace-nowrap">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              {complianceState[key].uploading ? "Uploading…" : complianceState[key].attachment_url ? "Replace" : "Upload"}
                              <input type="file" accept=".pdf,image/jpeg,image/png" className="hidden" onChange={(e) => handleAttachmentUpload(key, e)} disabled={complianceState[key].uploading} />
                            </label>
                          )}
                        </div>
                      </td>
                      <td />
                    </tr>
                  ))}

                  {/* Extra rows */}
                  {extraRows.map((row) => (
                    <tr key={row.rowId} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3">
                        {ro ? (
                          <span className="font-medium text-[#1A1A2E]">{row.type}</span>
                        ) : (
                          <select value={row.type} onChange={(e) => updateExtraRow(row.rowId, "type", e.target.value)} className={`${cellInp} text-xs`}>
                            {EXTRA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input value={row.number} onChange={(e) => updateExtraRow(row.rowId, "number", e.target.value)} disabled={ro} placeholder="ID number" className={cellInp} />
                      </td>
                      <td className="px-4 py-3">
                        <input value={row.login_id} onChange={(e) => updateExtraRow(row.rowId, "login_id", e.target.value)} disabled={ro} placeholder="Login ID" className={cellInp} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <input type={row.showCredential ? "text" : "password"} value={row.credential} onChange={(e) => updateExtraRow(row.rowId, "credential", e.target.value)} disabled={ro} placeholder="Password" autoComplete="new-password" className={`${cellInp} pr-8`} />
                          <button type="button" onClick={() => updateExtraRow(row.rowId, "showCredential", !row.showCredential)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                            <EyeIcon visible={row.showCredential} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {row.attachment_url && (
                            <a href={row.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#4A6FA5] hover:underline">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </a>
                          )}
                          {!ro && (
                            <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition whitespace-nowrap">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              {row.uploading ? "Uploading…" : row.attachment_url ? "Replace" : "Upload"}
                              <input type="file" accept=".pdf,image/jpeg,image/png" className="hidden" onChange={(e) => handleExtraAttachmentUpload(row.rowId, row.type, e)} disabled={row.uploading} />
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {!ro && (
                          <button type="button" onClick={() => removeExtraRow(row.rowId)} className="text-[#9CA3AF] hover:text-red-500 transition" title="Remove row">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Add Row */}
                  {!ro && (
                    <tr className="bg-[#FAFAFA]">
                      <td colSpan={6} className="px-4 py-3">
                        <button type="button" onClick={addExtraRow} className="inline-flex items-center gap-1.5 text-xs text-[#4A6FA5] hover:text-[#1E3A5F] transition font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Add Row
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!ro && (
            <>
              {profileError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{profileError}</div>}
              {profileSuccess && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Profile saved successfully.</div>}
              <div className="flex justify-end">
                <button type="submit" disabled={profileSaving} className="px-5 py-3 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
                  {profileSaving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </>
          )}
        </form>
      </section>

    </div>
  );
}
