import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import PlatformSettingsClient from "@/components/platform/PlatformSettingsClient";

export default async function PlatformSettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("*")
    .single();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Platform Settings</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          {user?.role === "super_admin"
            ? "Manage platform branding, support details, and your account."
            : "View platform settings and manage your account."}
        </p>
      </div>

      <PlatformSettingsClient
        settings={settings ?? { platform_name: "TaxVeteran", description: null, logo_url: null, support_email: null }}
        isSuperAdmin={user?.role === "super_admin"}
      />
    </div>
  );
}
