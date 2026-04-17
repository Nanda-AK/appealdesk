import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import LogsClient from "@/components/sp/LogsClient";
import { redirect } from "next/navigation";

export default async function LogsPage() {
  const user = await getCurrentUser();
  if (user?.role !== "sp_admin") redirect("/dashboard");

  const supabase = await createClient();
  const spId = user.service_provider_id ?? user.org_id;

  const { data: logs } = await supabase
    .from("audit_logs")
    .select(`
      id, action, entity_type, entity_label, created_at,
      actor:users!actor_id(first_name, last_name, role)
    `)
    .eq("service_provider_id", spId!)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-8">
      <LogsClient logs={(logs ?? []) as any} />
    </div>
  );
}
