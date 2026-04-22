import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { redirect } from "next/navigation";
import TrashClient from "@/components/sp/TrashClient";

export default async function TrashPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") redirect("/dashboard");

  const supabase = await createClient();
  const spId = user.service_provider_id ?? user.org_id;

  // 30-day window: only show items deleted within the last 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Need client org IDs to scope the user query (users have no service_provider_id column)
  const { data: clientOrgs } = await supabase
    .from("organizations")
    .select("id")
    .eq("parent_sp_id", spId!)
    .eq("type", "client");

  const clientOrgIds = (clientOrgs ?? []).map((o) => o.id);
  const allOrgIds = [spId!, ...clientOrgIds];

  const [
    { data: appeals },
    { data: clients },
    { data: users },
    { data: documents },
  ] = await Promise.all([
    // Deleted litigations
    supabase
      .from("appeals")
      .select(`
        id, deleted_at,
        act_regulation:master_records!act_regulation_id(name),
        financial_year:master_records!financial_year_id(name),
        assessment_year:master_records!assessment_year_id(name),
        client_org:organizations!client_org_id(name)
      `)
      .eq("service_provider_id", spId!)
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),

    // Deleted client organisations
    supabase
      .from("organizations")
      .select("id, name, deleted_at")
      .eq("parent_sp_id", spId!)
      .eq("type", "client")
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),

    // Deleted users (SP + client users under this SP)
    supabase
      .from("users")
      .select(`
        id, first_name, last_name, email, role, deleted_at,
        organization:organizations!org_id(name)
      `)
      .in("org_id", allOrgIds)
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),

    // Deleted documents
    supabase
      .from("appeal_documents")
      .select(`
        id, file_name, deleted_at,
        appeal:appeals!appeal_id(
          client_org:organizations!client_org_id(name)
        )
      `)
      .eq("service_provider_id", spId!)
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoff)
      .order("deleted_at", { ascending: false }),
  ]);

  // Normalize FK joins that Supabase may return as arrays
  const normalizedUsers = (users ?? []).map((u: any) => ({
    ...u,
    organization: Array.isArray(u.organization) ? (u.organization[0] ?? null) : u.organization,
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Recycle Bin</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          Deleted items are kept for 30 days, then permanently removed.
        </p>
      </div>
      <TrashClient
        appeals={(appeals ?? []) as any}
        clients={(clients ?? []) as any}
        users={normalizedUsers as any}
        documents={(documents ?? []) as any}
      />
    </div>
  );
}
