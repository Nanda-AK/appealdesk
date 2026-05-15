"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";

export interface LogFilters {
  filterAction?: string;
  filterEntity?: string;
  fromDate?: string;
  toDate?: string;
}

export async function exportLogs(filters: LogFilters) {
  const user = await getCurrentUser();
  if (user?.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createClient();
  const spId = user.service_provider_id ?? user.org_id;

  let q = supabase
    .from("audit_logs")
    .select(`id, action, entity_type, entity_label, created_at, actor:users!actor_id(first_name, last_name, role)`)
    .eq("service_provider_id", spId!)
    .order("created_at", { ascending: false });

  if (filters.filterAction) q = q.eq("action", filters.filterAction);
  if (filters.filterEntity) q = q.eq("entity_type", filters.filterEntity);
  if (filters.fromDate) q = q.gte("created_at", filters.fromDate);
  if (filters.toDate) q = q.lte("created_at", filters.toDate + "T23:59:59");

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
