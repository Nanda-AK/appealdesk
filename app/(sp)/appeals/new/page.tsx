import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import AppealForm from "@/components/sp/AppealForm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewAppealPage() {
  const user = await getCurrentUser();
  if (!user || !["sp_admin", "sp_staff"].includes(user.role)) redirect("/appeals");

  const supabase = await createClient();
  const spId = user.service_provider_id ?? user.org_id;

  const [{ data: clients }, { data: teamMembers }, { data: masters }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("parent_sp_id", spId!)
      .eq("type", "client")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("users")
      .select("id, first_name, last_name")
      .eq("org_id", spId!)
      .eq("is_active", true)
      .in("role", ["sp_admin", "sp_staff"]),
    supabase
      .from("master_records")
      .select("name, type")
      .eq("level", "platform")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const clientOrgIds = (clients ?? []).map((c) => c.id);
  const { data: allClientUsers } = clientOrgIds.length
    ? await supabase
        .from("users")
        .select("id, first_name, last_name, org_id")
        .in("org_id", clientOrgIds)
        .eq("role", "client")
        .eq("is_active", true)
    : { data: [] };

  const clientUsersByOrg = (allClientUsers ?? []).reduce((acc, u) => {
    if (!acc[u.org_id]) acc[u.org_id] = [];
    acc[u.org_id].push({ id: u.id, first_name: u.first_name, last_name: u.last_name });
    return acc;
  }, {} as Record<string, { id: string; first_name: string; last_name: string }[]>);

  const mastersByType = (masters ?? []).reduce((acc, rec) => {
    if (!acc[rec.type]) acc[rec.type] = [];
    acc[rec.type].push(rec.name);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/appeals" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Litigations
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Create New Litigation</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Fill in the litigation details and first proceeding below.</p>
      </div>
      <AppealForm
        clients={clients ?? []}
        teamMembers={teamMembers ?? []}
        mastersByType={mastersByType}
        clientUsersByOrg={clientUsersByOrg}
      />
    </div>
  );
}
