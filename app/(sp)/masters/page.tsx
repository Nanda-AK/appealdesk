import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import SpMastersClient from "@/components/sp/SpMastersClient";

export default async function SpMastersPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const spId = user?.service_provider_id ?? user?.org_id;

  // Fetch only platform-level records (SP cannot add custom records)
  const { data: records } = await supabase
    .from("master_records")
    .select("id, name, type, parent_id, is_active, sort_order")
    .eq("level", "platform")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Master Records</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          Platform-managed values used across all litigations
        </p>
      </div>
      <SpMastersClient
        records={records ?? []}
        isAdmin={user?.role === "sp_admin"}
      />
    </div>
  );
}
