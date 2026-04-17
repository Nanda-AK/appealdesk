import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import SpSettingsClient from "@/components/sp/SpSettingsClient";

export default async function SpSettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const spId = user?.service_provider_id ?? user?.org_id;

  const [{ data: org }, { data: compliance }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", spId!).single(),
    supabase.from("compliance_details").select("*").eq("org_id", spId!),
  ]);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Settings</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          {user?.role === "sp_admin"
            ? "Manage your organisation profile and account."
            : "View your organisation profile and manage your account."}
        </p>
      </div>

      <SpSettingsClient
        org={org}
        compliance={compliance ?? []}
        isAdmin={user?.role === "sp_admin"}
      />
    </div>
  );
}
