import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import AdminsClient from "@/components/platform/AdminsClient";

export default async function AdminsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: admins } = await supabase
    .from("users")
    .select("id, first_name, middle_name, last_name, email, role, is_active, created_at")
    .in("role", ["super_admin", "platform_admin"])
    .order("first_name");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Platform Admins</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          {admins?.length ?? 0} platform administrators
        </p>
      </div>
      <AdminsClient
        admins={admins ?? []}
        currentUserId={user!.id}
        isSuperAdmin={user!.role === "super_admin"}
      />
    </div>
  );
}
