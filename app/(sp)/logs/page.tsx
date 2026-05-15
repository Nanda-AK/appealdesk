import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import LogsClient from "@/components/sp/LogsClient";
import { redirect } from "next/navigation";

const PER_PAGE = 50;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getCurrentUser();
  if (user?.role !== "sp_admin") redirect("/dashboard");

  const params = await searchParams;
  const supabase = await createClient();
  const spId = user.service_provider_id ?? user.org_id;

  const page = Math.max(1, parseInt((params.page as string) ?? "1", 10));
  const filterAction = (params.action as string) ?? "";
  const filterEntity = (params.entity as string) ?? "";
  const fromDate = (params.from as string) ?? "";
  const toDate = (params.to as string) ?? "";

  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  let q = supabase
    .from("audit_logs")
    .select(`id, action, entity_type, entity_label, created_at, actor:users!actor_id(first_name, last_name, role)`, { count: "exact" })
    .eq("service_provider_id", spId!)
    .order("created_at", { ascending: false });

  if (filterAction) q = q.eq("action", filterAction);
  if (filterEntity) q = q.eq("entity_type", filterEntity);
  if (fromDate) q = q.gte("created_at", fromDate);
  if (toDate) q = q.lte("created_at", toDate + "T23:59:59");

  const { data: logs, count } = await q.range(from, to);

  return (
    <div className="p-8">
      <LogsClient
        logs={(logs ?? []) as any}
        totalCount={count ?? 0}
        page={page}
        perPage={PER_PAGE}
        currentAction={filterAction}
        currentEntity={filterEntity}
        currentFrom={fromDate}
        currentTo={toDate}
      />
    </div>
  );
}
