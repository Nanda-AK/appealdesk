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

  // Get active appeal IDs for this SP (to scope proceedings/events to this SP)
  const { data: activeAppeals } = await supabase
    .from("appeals")
    .select("id")
    .eq("service_provider_id", spId!)
    .is("deleted_at", null);

  const activeAppealIds = (activeAppeals ?? []).map((a) => a.id);

  // Get active proceeding IDs (to scope deleted events)
  const { data: activeProceedings } = activeAppealIds.length
    ? await supabase
        .from("proceedings")
        .select("id")
        .in("appeal_id", activeAppealIds)
        .is("deleted_at", null)
    : { data: [] };

  const activeProceedingIds = (activeProceedings ?? []).map((p) => p.id);

  const [
    { data: appeals },
    { data: clients },
    { data: users },
    { data: documents },
    { data: proceedings },
    { data: events },
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

    // Deleted proceedings (only from active/non-deleted appeals)
    activeAppealIds.length
      ? supabase
          .from("proceedings")
          .select(`
            id, authority_type, authority_name, deleted_at,
            proceeding_type:master_records!proceeding_type_id(name),
            appeal:appeals!appeal_id(
              client_org:organizations!client_org_id(name)
            )
          `)
          .in("appeal_id", activeAppealIds)
          .not("deleted_at", "is", null)
          .gte("deleted_at", cutoff)
          .order("deleted_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    // Deleted events (only from active/non-deleted proceedings)
    activeProceedingIds.length
      ? supabase
          .from("events")
          .select(`
            id, category, event_date, description, deleted_at,
            proceeding:proceedings!proceeding_id(
              appeal:appeals!appeal_id(
                client_org:organizations!client_org_id(name)
              )
            )
          `)
          .in("proceeding_id", activeProceedingIds)
          .not("deleted_at", "is", null)
          .gte("deleted_at", cutoff)
          .order("deleted_at", { ascending: false })
      : Promise.resolve({ data: [] }),
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
        proceedings={(proceedings ?? []) as any}
        events={(events ?? []) as any}
      />
    </div>
  );
}
