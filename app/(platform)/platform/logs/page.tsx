import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import PlatformLogsClient from "@/components/platform/PlatformLogsClient";
import { redirect } from "next/navigation";

export default async function PlatformLogsPage() {
  const user = await getCurrentUser();
  if (!user || !["super_admin", "platform_admin"].includes(user.role)) redirect("/platform/dashboard");

  const supabase = await createClient();

  const [{ data: logs }, { data: providers }] = await Promise.all([
    supabase
      .from("audit_logs")
      .select(`
        id, action, entity_type, entity_label, created_at, service_provider_id,
        actor:users!actor_id(first_name, last_name, role),
        service_provider:organizations!service_provider_id(name)
      `)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("type", "service_provider")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="p-8">
      <PlatformLogsClient logs={(logs ?? []) as any} providers={providers ?? []} />
    </div>
  );
}
