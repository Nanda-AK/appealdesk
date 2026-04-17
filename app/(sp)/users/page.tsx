import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import UsersClient from "@/components/sp/UsersClient";

export default async function UsersPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const spId = user?.service_provider_id ?? user?.org_id;

  // Fetch client org IDs under this SP first
  const { data: clientOrgs } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("parent_sp_id", spId!)
    .eq("type", "client")
    .eq("is_active", true)
    .order("name");

  const clientOrgIds = (clientOrgs ?? []).map((o) => o.id);

  // Fetch SP team users (sp_admin, sp_staff) whose org_id = spId
  // AND client users whose org_id is one of the client orgs
  const orgIdsToFetch = [spId!, ...clientOrgIds];

  const { data: users } = await supabase
    .from("users")
    .select(`
      id, first_name, middle_name, last_name, email,
      role, designation, department, is_active, created_at, org_id,
      organization:organizations!org_id(id, name, type)
    `)
    .in("org_id", orgIdsToFetch)
    .order("first_name");

  // Supabase returns FK joins as arrays; normalize to objects for the client component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedUsers = (users ?? []).map((u: any) => ({
    ...u,
    organization: Array.isArray(u.organization) ? (u.organization[0] ?? null) : u.organization,
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Users</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">{users?.length ?? 0} users in your workspace</p>
      </div>
      <UsersClient
        users={normalizedUsers}
        clientOrgs={clientOrgs ?? []}
        currentUserId={user!.id}
        isAdmin={user!.role === "sp_admin"}
      />
    </div>
  );
}
