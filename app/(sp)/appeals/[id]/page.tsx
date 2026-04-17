import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import AppealDetailClient from "@/components/sp/AppealDetailClient";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AppealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const spId = user?.service_provider_id ?? user?.org_id;

  const { data: appeal } = await supabase
    .from("appeals")
    .select(`
      id, act_regulation, financial_year, assessment_year, client_org_id, created_at,
      client_org:organizations!client_org_id(id, name),
      proceedings(
        id, proceeding_type, authority_type, authority_name,
        jurisdiction, jurisdiction_city, importance, mode,
        initiated_on, to_be_completed_by, assigned_to, client_staff_id,
        possible_outcome, is_active, created_at,
        assigned_user:users!assigned_to(first_name, last_name),
        client_staff:users!client_staff_id(first_name, last_name),
        events(id, category, event_date, description, details, created_at)
      ),
      documents:appeal_documents(
        id, file_name, file_url, file_size, created_at,
        uploaded_by_user:users!uploaded_by(first_name, last_name)
      )
    `)
    .eq("id", id)
    .single();

  if (!appeal) notFound();

  const clientOrgId = (appeal as any).client_org_id as string;

  const [{ data: clients }, { data: teamMembers }, { data: clientUsers }, { data: masters }] = await Promise.all([
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
      .from("users")
      .select("id, first_name, last_name")
      .eq("org_id", clientOrgId)
      .eq("role", "client")
      .eq("is_active", true),
    supabase
      .from("master_records")
      .select("name, type")
      .or(`level.eq.platform,service_provider_id.eq.${spId}`)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const mastersByType = (masters ?? []).reduce((acc, rec) => {
    if (!acc[rec.type]) acc[rec.type] = [];
    acc[rec.type].push(rec.name);
    return acc;
  }, {} as Record<string, string[]>);

  const clientOrg = (appeal.client_org as any) ?? null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/appeals" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Appeals
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">
          {clientOrg?.name ?? "Appeal"}
          {appeal.assessment_year ? ` — AY ${appeal.assessment_year}` : ""}
        </h1>
        {appeal.act_regulation && (
          <p className="text-[#6B7280] text-sm mt-0.5">{appeal.act_regulation}</p>
        )}
      </div>
      <AppealDetailClient
        appeal={appeal as any}
        clients={clients ?? []}
        teamMembers={teamMembers ?? []}
        clientUsers={clientUsers ?? []}
        mastersByType={mastersByType}
        canEdit={user?.role === "sp_admin" || user?.role === "sp_staff"}
      />
    </div>
  );
}
