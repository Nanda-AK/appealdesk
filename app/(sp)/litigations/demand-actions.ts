"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import type { DemandIssue, DemandIssueInput } from "@/lib/types";
import { computeDemandTotals, type DemandTotals } from "@/lib/demand";

export async function getDemandIssues(proceedingId: string): Promise<DemandIssue[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("proceeding_demand_issues")
    .select("*")
    .eq("proceeding_id", proceedingId)
    .eq("service_provider_id", user.service_provider_id!)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as DemandIssue[];
}

// Bulk-fetch demand totals across many proceedings in one query, for
// aggregate/summary views (e.g. the Proceedings section) that would
// otherwise need one getDemandIssues() call per proceeding.
export async function getBulkDemandTotals(
  proceedingIds: string[]
): Promise<Record<string, DemandTotals>> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (proceedingIds.length === 0) return {};

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("proceeding_demand_issues")
    .select("*")
    .eq("service_provider_id", user.service_provider_id!)
    .in("proceeding_id", proceedingIds);

  if (error) throw new Error(error.message);

  const grouped = new Map<string, DemandIssue[]>();
  ((data ?? []) as DemandIssue[]).forEach((iss) => {
    grouped.set(iss.proceeding_id, [...(grouped.get(iss.proceeding_id) ?? []), iss]);
  });

  return Object.fromEntries(
    proceedingIds.map((id) => [id, computeDemandTotals(grouped.get(id) ?? [])])
  );
}

export async function saveDemandIssues(
  proceedingId: string,
  issues: DemandIssueInput[]
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!["sp_admin", "sp_staff"].includes(user.role)) throw new Error("Unauthorized");

  const supabase = await createServiceClient();
  const spId = user.service_provider_id!;

  // Delete all existing issues for this proceeding
  const { error: delError } = await supabase
    .from("proceeding_demand_issues")
    .delete()
    .eq("proceeding_id", proceedingId)
    .eq("service_provider_id", spId);

  if (delError) throw new Error(delError.message);

  // Insert the new list
  if (issues.length > 0) {
    const { error: insError } = await supabase
      .from("proceeding_demand_issues")
      .insert(
        issues.map((iss, i) => ({
          ...iss,
          proceeding_id: proceedingId,
          service_provider_id: spId,
          sort_order: i,
        }))
      );

    if (insError) throw new Error(insError.message);
  }

  await logAction(supabase, {
    actorId: user.id,
    spId,
    action: "update",
    entityType: "proceeding",
    entityLabel: `Demand amounts for proceeding ${proceedingId}`,
  });

  revalidatePath("/litigations");
}
