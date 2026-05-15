"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";

export interface AppealInput {
  client_org_id: string;
  financial_year_id?: string;
  assessment_year_id?: string;
  act_regulation_id?: string;
  status?: string;
}

export interface ProceedingInput {
  proceeding_type_id?: string;
  authority_type?: string;
  authority_name?: string;
  jurisdiction?: string;
  jurisdiction_city?: string;
  importance?: string;
  mode?: string;
  initiated_on?: string;
  to_be_completed_by?: string;
  assigned_to_ids?: string[];
  client_staff_ids?: string[];
  possible_outcome?: string;
  status?: string;
}

export interface EventInput {
  proceeding_id: string;
  event_type: string;        // 'main' | 'sub'
  category: string;
  parent_event_id?: string;  // sub events reference their parent main event
  event_date?: string;
  status?: string;           // 'open' | 'in_progress' | 'closed'
  event_notice_number?: string;
  description?: string;
  details?: Record<string, string>;
}

function spOnly(role: string) {
  if (!["sp_admin", "sp_staff"].includes(role)) throw new Error("Unauthorized");
}

function cleanProceeding(proc: ProceedingInput) {
  return {
    proceeding_type_id: proc.proceeding_type_id || null,
    authority_type: proc.authority_type || null,
    authority_name: proc.authority_name || null,
    jurisdiction: proc.jurisdiction || null,
    jurisdiction_city: proc.jurisdiction_city || null,
    importance: (proc.importance as "critical" | "high" | "medium" | "low") || null,
    mode: (proc.mode as "online" | "offline") || null,
    initiated_on: proc.initiated_on || null,
    to_be_completed_by: proc.to_be_completed_by || null,
    assigned_to: proc.assigned_to_ids?.[0] || null,
    client_staff_id: proc.client_staff_ids?.[0] || null,
    assigned_to_ids: proc.assigned_to_ids ?? [],
    client_staff_ids: proc.client_staff_ids ?? [],
    possible_outcome: (proc.possible_outcome as "favourable" | "doubtful" | "unfavourable") || null,
    status: proc.status || "open",
  };
}

const EVENT_CATEGORY_LABELS: Record<string, string> = {
  notice_from_authority: "Notice from Authority",
  show_cause_notice: "Show Cause Notice (SCN)",
  personal_hearing_notice: "Personal Hearing Notice",
  virtual_hearing_notice: "Virtual Hearing Notice",
  assessment_order: "Assessment Order",
  penalty_order: "Penalty Order",
  filing_of_appeal: "Filing of Appeal",
  others: "Others",
  response_to_notice: "Response to Notice",
  adjournment_request: "Adjournment Request",
  personal_follow_up: "Personal Follow-up",
  others_sub: "Others",
};

async function buildAppealLabel(supabase: Awaited<ReturnType<typeof createServiceClient>>, appealId: string): Promise<string> {
  const { data } = await supabase
    .from("appeals")
    .select("client_org:organizations!client_org_id(name), assessment_year:master_records!assessment_year_id(name)")
    .eq("id", appealId)
    .single();
  if (!data) return "Unknown Litigation";
  const client = (data.client_org as any)?.name ?? "";
  const ay = (data.assessment_year as any)?.name ?? "";
  return ay ? `${client} — AY ${ay}` : client || "Unknown";
}

export async function createAppeal(appeal: AppealInput, proceeding: ProceedingInput): Promise<{ appealId: string; proceedingId: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { data: newAppeal, error: aErr } = await supabase
    .from("appeals")
    .insert({
      service_provider_id: spId,
      client_org_id: appeal.client_org_id,
      financial_year_id: appeal.financial_year_id || null,
      assessment_year_id: appeal.assessment_year_id || null,
      act_regulation_id: appeal.act_regulation_id || null,
      status: appeal.status || "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (aErr || !newAppeal) throw new Error(aErr?.message ?? "Failed to create appeal");

  const { data: newProceeding, error: pErr } = await supabase.from("proceedings").insert({
    appeal_id: newAppeal.id,
    service_provider_id: spId,
    ...cleanProceeding(proceeding),
  }).select("id").single();

  if (pErr || !newProceeding) throw new Error(pErr?.message ?? "Failed to create proceeding");

  const appealLabel = await buildAppealLabel(supabase, newAppeal.id);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "create", entityType: "appeal", entityLabel: appealLabel });

  revalidatePath("/litigations");
  return { appealId: newAppeal.id, proceedingId: newProceeding.id };
}

export async function updateAppeal(appealId: string, appeal: AppealInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("appeals")
    .update({
      client_org_id: appeal.client_org_id,
      financial_year_id: appeal.financial_year_id || null,
      assessment_year_id: appeal.assessment_year_id || null,
      act_regulation_id: appeal.act_regulation_id || null,
      status: appeal.status || "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", appealId);

  if (error) throw new Error(error.message);
  const spId = user.service_provider_id ?? user.org_id;
  const appealLabel = await buildAppealLabel(supabase, appealId);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "update", entityType: "appeal", entityLabel: appealLabel });
  revalidatePath(`/litigations/${appealId}`);
  revalidatePath("/litigations");
}

export async function updateProceeding(proceedingId: string, proc: ProceedingInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("proceedings")
    .update({ ...cleanProceeding(proc), updated_at: new Date().toISOString() })
    .eq("id", proceedingId);

  if (error) throw new Error(error.message);
  const spId = user.service_provider_id ?? user.org_id;
  const { data: procRef } = await supabase.from("proceedings").select("appeal_id").eq("id", proceedingId).single();
  const procLabel = procRef?.appeal_id ? await buildAppealLabel(supabase, procRef.appeal_id) : proceedingId;
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "update", entityType: "proceeding", entityLabel: procLabel });
  revalidatePath("/litigations");
}

export async function addProceeding(appealId: string, proc: ProceedingInput): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from("proceedings").insert({
    appeal_id: appealId,
    service_provider_id: spId,
    ...cleanProceeding(proc),
  }).select("id").single();

  if (error) throw new Error(error.message);
  const procAppealLabel = await buildAppealLabel(supabase, appealId);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "create", entityType: "proceeding", entityLabel: procAppealLabel });
  revalidatePath(`/litigations/${appealId}`);
  revalidatePath("/litigations");
  return data.id;
}

export async function updateEvent(eventId: string, input: EventInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const supabase = await createServiceClient();

  const PRIMARY_DATE: Record<string, string> = {
    notice_from_authority: "date_of_notice",
    show_cause_notice: "date_of_notice",
    response_to_notice: "response_submitted_on",
    adjournment_request: "adjourned_to",
    personal_hearing: "hearing_date",
    virtual_hearing: "hearing_date",
    personal_follow_up: "against_notice_dated",
    assessment_order: "date_of_order",
    notice_of_penalty: "date_of_notice",
    penalty_order: "date_of_order",
  };
  const primaryKey = PRIMARY_DATE[input.category];
  const primaryDate =
    primaryKey && input.details?.[primaryKey]
      ? new Date(input.details[primaryKey]).toISOString()
      : input.event_date || null;

  const { error } = await supabase
    .from("events")
    .update({
      category: input.category,
      event_date: primaryDate,
      event_type: input.event_type || "main",
      parent_event_id: input.parent_event_id ?? null,
      status: input.status || "open",
      event_notice_number: input.event_notice_number || null,
      description: input.description || null,
      details: input.details ?? {},
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  const spId = user.service_provider_id ?? user.org_id;
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "update", entityType: "event", entityLabel: EVENT_CATEGORY_LABELS[input.category] ?? input.category });
  revalidatePath("/litigations");
}

export async function addEvent(input: EventInput): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from("events").insert({
    proceeding_id: input.proceeding_id,
    service_provider_id: spId,
    event_type: input.event_type || "main",
    category: input.category,
    parent_event_id: input.parent_event_id || null,
    event_date: input.event_date || null,
    status: input.status || "open",
    event_notice_number: input.event_notice_number || null,
    description: input.description || null,
    details: input.details ?? {},
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "create", entityType: "event", entityLabel: EVENT_CATEGORY_LABELS[input.category] ?? input.category });
  revalidatePath("/litigations");
  return data.id;
}

export async function deleteProceeding(proceedingId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const now = new Date().toISOString();

  // Fetch label before cascade so we can record it in the log
  const { data: delProcRef } = await supabase.from("proceedings").select("appeal_id").eq("id", proceedingId).single();
  const delProcLabel = delProcRef?.appeal_id ? await buildAppealLabel(supabase, delProcRef.appeal_id) : proceedingId;

  // Get event IDs for cascade
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("proceeding_id", proceedingId)
    .is("deleted_at", null);

  if (events?.length) {
    const evtIds = events.map((e) => e.id);
    await supabase.from("event_documents").update({ deleted_at: now }).in("event_id", evtIds).is("deleted_at", null);
    await supabase.from("events").update({ deleted_at: now }).in("id", evtIds);
  }

  await supabase.from("proceeding_documents").update({ deleted_at: now }).eq("proceeding_id", proceedingId).is("deleted_at", null);

  const { error } = await supabase.from("proceedings").update({ deleted_at: now }).eq("id", proceedingId);
  if (error) throw new Error(error.message);

  await logAction(supabase, { actorId: user.id, spId: spId!, action: "delete", entityType: "proceeding", entityLabel: delProcLabel });
  revalidatePath("/litigations");
}

export async function deleteEvent(eventId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const now = new Date().toISOString();
  const { data: evtRef } = await supabase.from("events").select("category").eq("id", eventId).single();
  const evtLabel = evtRef?.category ? EVENT_CATEGORY_LABELS[evtRef.category] ?? evtRef.category : eventId;

  await supabase.from("event_documents").update({ deleted_at: now }).eq("event_id", eventId).is("deleted_at", null);

  const { error } = await supabase.from("events").update({ deleted_at: now }).eq("id", eventId);
  if (error) throw new Error(error.message);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "delete", entityType: "event", entityLabel: evtLabel });
  revalidatePath("/litigations");
}

export async function deleteAppeal(appealId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const now = new Date().toISOString();
  const delAppealLabel = await buildAppealLabel(supabase, appealId);

  const { data: proceedings } = await supabase
    .from("proceedings")
    .select("id")
    .eq("appeal_id", appealId)
    .is("deleted_at", null);

  if (proceedings?.length) {
    const procIds = proceedings.map((p) => p.id);

    const { data: events } = await supabase
      .from("events")
      .select("id")
      .in("proceeding_id", procIds)
      .is("deleted_at", null);

    if (events?.length) {
      const evtIds = events.map((e) => e.id);
      await supabase.from("event_documents").update({ deleted_at: now }).in("event_id", evtIds).is("deleted_at", null);
      await supabase.from("events").update({ deleted_at: now }).in("id", evtIds);
    }

    await supabase.from("proceeding_documents").update({ deleted_at: now }).in("proceeding_id", procIds).is("deleted_at", null);
    await supabase.from("proceedings").update({ deleted_at: now }).in("id", procIds);
  }

  // Legacy appeal_documents (kept for any existing data)
  await supabase.from("appeal_documents").update({ deleted_at: now }).eq("appeal_id", appealId).is("deleted_at", null);

  const { error } = await supabase.from("appeals").update({ deleted_at: now }).eq("id", appealId);
  if (error) throw new Error("Failed to delete appeal: " + error.message);

  await logAction(supabase, { actorId: user.id, spId: spId!, action: "delete", entityType: "appeal", entityLabel: delAppealLabel });
  revalidatePath("/litigations");
  revalidatePath(`/litigations/${appealId}`);
}

// ── Proceeding Documents ─────────────────────────────────────────

export async function uploadProceedingDocument(
  proceedingId: string,
  fileName: string,
  fileUrl: string,
  fileSize: number,
  description?: string,
): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from("proceeding_documents").insert({
    proceeding_id: proceedingId,
    service_provider_id: spId,
    file_name: fileName,
    file_url: fileUrl,
    file_size: fileSize,
    uploaded_by: user.id,
    description: description || null,
  }).select("id").single();

  if (error) throw new Error(error.message);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "create", entityType: "document", entityLabel: fileName });
  revalidatePath("/litigations");
  return data.id;
}

export async function deleteProceedingDocument(docId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { data: docRef } = await supabase.from("proceeding_documents").select("file_name").eq("id", docId).single();

  const { error } = await supabase
    .from("proceeding_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) throw new Error(error.message);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "delete", entityType: "document", entityLabel: docRef?.file_name ?? docId });
  revalidatePath("/litigations");
}

// ── Event Documents ──────────────────────────────────────────────

export async function uploadEventDocument(
  eventId: string,
  fileName: string,
  fileUrl: string,
  fileSize: number,
  description?: string,
): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { data, error } = await supabase.from("event_documents").insert({
    event_id: eventId,
    service_provider_id: spId,
    file_name: fileName,
    file_url: fileUrl,
    file_size: fileSize,
    uploaded_by: user.id,
    description: description || null,
  }).select("id").single();

  if (error) throw new Error(error.message);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "create", entityType: "document", entityLabel: fileName });
  revalidatePath("/litigations");
  return data.id;
}

export async function deleteEventDocument(docId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { data: evtDocRef } = await supabase.from("event_documents").select("file_name").eq("id", docId).single();

  const { error } = await supabase
    .from("event_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) throw new Error(error.message);
  await logAction(supabase, { actorId: user.id, spId: spId!, action: "delete", entityType: "document", entityLabel: evtDocRef?.file_name ?? docId });
  revalidatePath("/litigations");
}
