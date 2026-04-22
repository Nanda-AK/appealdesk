import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import AppealsClient from "@/components/sp/AppealsClient";
import { PER_PAGE_OPTIONS, DEFAULT_PER_PAGE } from "@/lib/constants";

export default async function AppealsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const spId = user?.service_provider_id ?? user?.org_id;
  const isClient = user?.role === "client";

  // Parse URL params
  const page = Math.max(1, parseInt((params.page as string) ?? "1", 10));
  const perPageRaw = parseInt((params.per_page as string) ?? "", 10);
  const perPage = PER_PAGE_OPTIONS.includes(perPageRaw) ? perPageRaw : DEFAULT_PER_PAGE;
  const search = (params.search as string) ?? "";
  const filterClient = (params.client as string) ?? "";
  const filterAY = (params.ay as string) ?? "";
  const filterImportance = (params.importance as string) ?? "";
  const filterAssigned = (params.assigned as string) ?? "";
  const filterStatus = (params.status as string) ?? "";
  const sortAsc = (params.sort_dir as string) === "asc";

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // Step 1: resolve proceedings-based filters → get matching appeal IDs
  let procAppealIds: string[] | null = null;
  if (filterImportance || filterAssigned) {
    let procQ = supabase
      .from("proceedings")
      .select("appeal_id")
      .eq("is_active", true);
    if (filterImportance) procQ = procQ.eq("importance", filterImportance);
    if (filterAssigned) procQ = procQ.eq("assigned_to", filterAssigned);
    const { data: procs } = await procQ;
    procAppealIds = [...new Set((procs ?? []).map((p: any) => p.appeal_id as string))];
  }

  // Step 2: resolve text search → get matching client org IDs
  let searchOrgIds: string[] | null = null;
  if (search) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id")
      .ilike("name", `%${search}%`)
      .eq("parent_sp_id", spId!);
    searchOrgIds = (orgs ?? []).map((o: any) => o.id as string);
  }

  // Step 3: build main query
  let appealsQuery = supabase
    .from("appeals")
    .select(
      `id, act_regulation, financial_year, assessment_year, status, created_at,
      client_org:organizations!client_org_id(id, name),
      proceedings(
        id, proceeding_type, authority_name, importance, status,
        to_be_completed_by, assigned_to, possible_outcome, is_active,
        assigned_user:users!assigned_to(first_name, last_name)
      )`,
      { count: "exact" }
    )
    .eq("service_provider_id", spId!);

  if (isClient) appealsQuery = appealsQuery.eq("client_org_id", user!.org_id!);
  if (filterClient) appealsQuery = appealsQuery.eq("client_org_id", filterClient);
  if (filterAY) appealsQuery = appealsQuery.eq("assessment_year", filterAY);
  if (filterStatus) appealsQuery = appealsQuery.eq("status", filterStatus);
  if (procAppealIds !== null) {
    if (procAppealIds.length === 0) {
      // No proceedings match — return empty result without hitting DB again
      const [{ data: clients }, { data: teamMembers }, { data: ayRows }] = await Promise.all([
        supabase.from("organizations").select("id, name").eq("parent_sp_id", spId!).eq("type", "client").eq("is_active", true).order("name"),
        supabase.from("users").select("id, first_name, last_name").eq("org_id", spId!).eq("is_active", true).in("role", ["sp_admin", "sp_staff"]),
        supabase.from("appeals").select("assessment_year").eq("service_provider_id", spId!).not("assessment_year", "is", null),
      ]);
      const assessmentYears = [...new Set((ayRows ?? []).map((a: any) => a.assessment_year as string))].sort().reverse();
      return (
        <div className="p-8">
          <AppealsClient
            appeals={[]} clients={clients ?? []} teamMembers={teamMembers ?? []}
            canEdit={user?.role === "sp_admin" || user?.role === "sp_staff"}
            totalCount={0} page={1} perPage={perPage} assessmentYears={assessmentYears}
            currentSearch={search} currentClient={filterClient} currentAY={filterAY}
            currentImportance={filterImportance} currentAssigned={filterAssigned}
            currentStatus={filterStatus} currentSortDir={sortAsc ? "asc" : "desc"}
          />
        </div>
      );
    }
    appealsQuery = appealsQuery.in("id", procAppealIds);
  }
  if (searchOrgIds !== null) {
    if (searchOrgIds.length === 0) {
      const [{ data: clients }, { data: teamMembers }, { data: ayRows }] = await Promise.all([
        supabase.from("organizations").select("id, name").eq("parent_sp_id", spId!).eq("type", "client").eq("is_active", true).order("name"),
        supabase.from("users").select("id, first_name, last_name").eq("org_id", spId!).eq("is_active", true).in("role", ["sp_admin", "sp_staff"]),
        supabase.from("appeals").select("assessment_year").eq("service_provider_id", spId!).not("assessment_year", "is", null),
      ]);
      const assessmentYears = [...new Set((ayRows ?? []).map((a: any) => a.assessment_year as string))].sort().reverse();
      return (
        <div className="p-8">
          <AppealsClient
            appeals={[]} clients={clients ?? []} teamMembers={teamMembers ?? []}
            canEdit={user?.role === "sp_admin" || user?.role === "sp_staff"}
            totalCount={0} page={1} perPage={perPage} assessmentYears={assessmentYears}
            currentSearch={search} currentClient={filterClient} currentAY={filterAY}
            currentImportance={filterImportance} currentAssigned={filterAssigned}
            currentStatus={filterStatus} currentSortDir={sortAsc ? "asc" : "desc"}
          />
        </div>
      );
    }
    appealsQuery = appealsQuery.in("client_org_id", searchOrgIds);
  }

  appealsQuery = appealsQuery
    .order("created_at", { ascending: sortAsc })
    .range(from, to);

  const [{ data: appeals, count }, { data: clients }, { data: teamMembers }, { data: ayRows }] = await Promise.all([
    appealsQuery,
    supabase.from("organizations").select("id, name").eq("parent_sp_id", spId!).eq("type", "client").eq("is_active", true).order("name"),
    supabase.from("users").select("id, first_name, last_name").eq("org_id", spId!).eq("is_active", true).in("role", ["sp_admin", "sp_staff"]),
    supabase.from("appeals").select("assessment_year").eq("service_provider_id", spId!).not("assessment_year", "is", null),
  ]);

  const assessmentYears = [...new Set((ayRows ?? []).map((a: any) => a.assessment_year as string))].sort().reverse();

  return (
    <div className="p-8">
      <AppealsClient
        appeals={(appeals ?? []) as any}
        clients={clients ?? []}
        teamMembers={teamMembers ?? []}
        canEdit={user?.role === "sp_admin" || user?.role === "sp_staff"}
        totalCount={count ?? 0}
        page={page}
        perPage={perPage}
        assessmentYears={assessmentYears}
        currentSearch={search}
        currentClient={filterClient}
        currentAY={filterAY}
        currentImportance={filterImportance}
        currentAssigned={filterAssigned}
        currentStatus={filterStatus}
        currentSortDir={sortAsc ? "asc" : "desc"}
      />
    </div>
  );
}
