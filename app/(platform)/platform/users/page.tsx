import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import PlatformUsersClient from "@/components/platform/PlatformUsersClient";

export default async function UsersPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: platformUsers }, { data: spUsers }, { data: providers }] = await Promise.all([
    supabase
      .from("users")
      .select("id, first_name, middle_name, last_name, email, role, is_active, created_at")
      .in("role", ["super_admin", "platform_admin"])
      .order("first_name"),
    supabase
      .from("users")
      .select("id, first_name, middle_name, last_name, email, designation, is_active, created_at, org_id, organizations(id, name)")
      .eq("role", "sp_admin")
      .order("first_name"),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("type", "service_provider")
      .order("name"),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Users</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          Platform and service provider admin accounts
        </p>
      </div>
      <PlatformUsersClient
        platformUsers={platformUsers ?? []}
        spAdmins={(spUsers ?? []).map((u) => ({
          id: u.id,
          first_name: u.first_name,
          middle_name: u.middle_name ?? undefined,
          last_name: u.last_name,
          email: u.email,
          designation: u.designation,
          is_active: u.is_active,
          created_at: u.created_at,
          org_id: u.org_id,
          organization: (Array.isArray(u.organizations) ? u.organizations[0] : u.organizations) as { id: string; name: string } | null,
        }))}
        currentUserId={user!.id}
        isSuperAdmin={user!.role === "super_admin"}
        isPlatformAdmin={user!.role === "platform_admin"}
      />
    </div>
  );
}
