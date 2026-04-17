import { SupabaseClient } from "@supabase/supabase-js";

export async function logAction(
  supabase: SupabaseClient,
  params: {
    actorId: string;
    spId: string;
    action: "create" | "update" | "delete";
    entityType: "appeal" | "proceeding" | "event" | "document";
    entityLabel?: string;
  }
) {
  // Fire and forget — don't block the main action on log failures
  await supabase.from("audit_logs").insert({
    actor_id: params.actorId,
    service_provider_id: params.spId,
    action: params.action,
    entity_type: params.entityType,
    entity_label: params.entityLabel ?? null,
  }).then(() => {});
}
