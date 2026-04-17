import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import AppealsClient from "@/components/sp/AppealsClient";

export default async function AppealsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const spId = user?.service_provider_id ?? user?.org_id;
  const isClient = user?.role === "client";

  let appealsQuery = supabase
    .from("appeals")
    .select(`
      id, act_regulation, financial_year, assessment_year, created_at,
      client_org:organizations!client_org_id(id, name),
      proceedings(
        id, proceeding_type, authority_name, importance,
        to_be_completed_by, assigned_to, possible_outcome, is_active,
        assigned_user:users!assigned_to(first_name, last_name)
      )
    `)
    .eq("service_provider_id", spId!)
    .order("created_at", { ascending: false });

  // Client users only see their own org's appeals
  if (isClient) {
    appealsQuery = appealsQuery.eq("client_org_id", user!.org_id!);
  }

  const [{ data: appeals }, { data: clients }, { data: teamMembers }] = await Promise.all([
    appealsQuery,
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
  ]);

  return (
    <div className="p-8">
      <AppealsClient
        appeals={(appeals ?? []) as any}
        clients={clients ?? []}
        teamMembers={teamMembers ?? []}
        canEdit={user?.role === "sp_admin" || user?.role === "sp_staff"}
      />
    </div>
  );
}
