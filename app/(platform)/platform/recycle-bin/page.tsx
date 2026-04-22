import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { redirect } from "next/navigation";
import PlatformRecycleBinClient from "@/components/platform/PlatformRecycleBinClient";

export default async function PlatformRecycleBinPage() {
  const user = await getCurrentUser();
  if (!user || !["super_admin", "platform_admin"].includes(user.role)) redirect("/platform/dashboard");

  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Platform users: super_admin, platform_admin, sp_admin — deleted within 30 days
  const { data: users } = await supabase
    .from("users")
    .select(`
      id, first_name, last_name, email, role, deleted_at,
      organization:organizations!org_id(name)
    `)
    .in("role", ["super_admin", "platform_admin", "sp_admin"])
    .not("deleted_at", "is", null)
    .gte("deleted_at", cutoff)
    .order("deleted_at", { ascending: false });

  const normalizedUsers = (users ?? []).map((u: any) => ({
    ...u,
    organization: Array.isArray(u.organization) ? (u.organization[0] ?? null) : u.organization,
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Recycle Bin</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          Deleted platform items are kept for 30 days, then permanently removed.
        </p>
      </div>
      <PlatformRecycleBinClient users={normalizedUsers as any} />
    </div>
  );
}
