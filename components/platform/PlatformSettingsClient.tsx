"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePlatformSettings } from "@/app/(platform)/platform/settings/actions";

interface Settings {
  platform_name: string;
  logo_url: string | null;
  support_email: string | null;
}

interface Props {
  settings: Settings;
  isSuperAdmin: boolean;
}

export default function PlatformSettingsClient({ settings, isSuperAdmin }: Props) {
  // Branding state
  const [platformName, setPlatformName] = useState(settings.platform_name);
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? "");
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  const fieldClass = (disabled: boolean) =>
    `w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] ${
      disabled ? "bg-[#F8F9FA] text-[#6B7280] cursor-not-allowed" : ""
    }`;

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("org-files")
      .upload(`platform/logo-${Date.now()}-${file.name}`, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from("org-files").getPublicUrl(data.path);
      setLogoUrl(urlData.publicUrl);
    }
    setLogoUploading(false);
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!platformName.trim()) { setBrandingError("Platform name is required."); return; }
    setBrandingSaving(true);
    setBrandingError(null);
    setBrandingSuccess(false);
    try {
      await updatePlatformSettings({
        platform_name: platformName,
        logo_url: logoUrl || undefined,
        support_email: supportEmail || undefined,
      });
      setBrandingSuccess(true);
      setTimeout(() => setBrandingSuccess(false), 3000);
    } catch (err) {
      setBrandingError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setBrandingSaving(false);
    }
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

  return (
    <div className="space-y-6">

      {/* ── Platform Branding ── */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] mb-1 pb-3 border-b border-[#E5E7EB] flex items-center justify-between">
          Platform Branding
          {!isSuperAdmin && (
            <span className="text-xs font-normal text-[#9CA3AF]">Read-only</span>
          )}
        </h2>

        <form onSubmit={handleSaveBranding} className="mt-4 space-y-5">
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-2">
              Platform Logo <span className="text-[#9CA3AF]">(JPG/PNG, max 2MB)</span>
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Platform logo" className="w-14 h-14 rounded-xl object-cover border border-[#E5E7EB]" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#1E3A5F] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">
                    {platformName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isSuperAdmin && (
                <div className="space-y-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-[#F8F9FA] transition">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="text-xs text-red-500 hover:text-red-700 pl-1"
                    >
                      Remove logo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Platform Name */}
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
              Platform Name <span className="text-red-500">*</span>
            </label>
            <input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              disabled={!isSuperAdmin}
              className={fieldClass(!isSuperAdmin)}
              placeholder="e.g. AppealDesk"
            />
          </div>

          {/* Support Email */}
          <div>
            <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              disabled={!isSuperAdmin}
              className={fieldClass(!isSuperAdmin)}
              placeholder="support@appealdesk.com"
            />
            <p className="text-xs text-[#9CA3AF] mt-1">
              Shown to users when they need help (e.g. on the login page).
            </p>
          </div>

          {isSuperAdmin && (
            <>
              {brandingError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {brandingError}
                </div>
              )}
              {brandingSuccess && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  Settings saved successfully.
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={brandingSaving}
                  className="px-5 py-2.5 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60"
                >
                  {brandingSaving ? "Saving…" : "Save Branding"}
                </button>
              </div>
            </>
          )}
        </form>
      </section>

    </div>
  );
}
