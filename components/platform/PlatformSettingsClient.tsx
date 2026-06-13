"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { updatePlatformSettings } from "@/app/(platform)/platform/settings/actions";

interface Settings {
  platform_name: string;
  description: string | null;
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
  const [description, setDescription] = useState(settings.description ?? "");
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? "");
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  const fieldClass = (disabled: boolean) =>
    `w-full px-3 py-2 text-sm border border-accent rounded-lg focus:outline-none focus:ring-1 focus:ring-primary ${
      disabled ? "bg-page text-secondary cursor-not-allowed" : ""
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
        description: description || undefined,
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

  return (
    <div className="space-y-6">

      {/* ── Platform Branding ── */}
      <section className="bg-white border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-heading mb-1 pb-3 border-b border-border flex items-center justify-between">
          Platform Branding
          {!isSuperAdmin && (
            <span className="text-xs font-normal text-muted">Read-only</span>
          )}
        </h2>

        <form onSubmit={handleSaveBranding} className="mt-4 space-y-5">
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-2">
              Platform Logo <span className="text-muted">(JPG/PNG, max 2MB)</span>
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <Image src={logoUrl} alt="Platform logo" width={56} height={56} className="w-14 h-14 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">
                    {platformName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isSuperAdmin && (
                <div className="space-y-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg text-secondary hover:bg-page transition">
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
            <label className="block text-xs font-medium text-secondary mb-1.5">
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

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Tagline / Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isSuperAdmin}
              className={fieldClass(!isSuperAdmin)}
              placeholder="e.g. Your AI Tax Attorney"
            />
            <p className="text-xs text-muted mt-1">
              Shown below the platform name on the login page.
            </p>
          </div>

          {/* Support Email */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              disabled={!isSuperAdmin}
              className={fieldClass(!isSuperAdmin)}
              placeholder="support@appealdesk.com"
            />
            <p className="text-xs text-muted mt-1">
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
                  className="px-5 py-2.5 text-sm bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition disabled:opacity-60"
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
