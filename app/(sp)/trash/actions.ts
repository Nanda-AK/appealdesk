"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

function adminOnly(role: string) {
  if (role !== "sp_admin") throw new Error("Unauthorized");
}

// ── RESTORE ────────────────────────────────────────────

export async function restoreAppeal(appealId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  // Restore proceeding cascade
  const { data: proceedings } = await supabase
    .from("proceedings")
    .select("id")
    .eq("appeal_id", appealId);

  if (proceedings?.length) {
    const procIds = proceedings.map((p) => p.id);
    await supabase.from("events").update({ deleted_at: null }).in("proceeding_id", procIds);
    await supabase.from("proceedings").update({ deleted_at: null }).in("id", procIds);
  }

  await supabase.from("appeal_documents").update({ deleted_at: null }).eq("appeal_id", appealId);
  await supabase.from("appeals").update({ deleted_at: null }).eq("id", appealId);

  revalidatePath("/trash");
  revalidatePath("/litigations");
}

export async function restoreClient(orgId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  // Restore org users
  await supabase.from("users").update({ deleted_at: null, is_active: true }).eq("org_id", orgId);

  // Restore appeals and their children
  const { data: appeals } = await supabase
    .from("appeals")
    .select("id")
    .eq("client_org_id", orgId);

  if (appeals?.length) {
    const appealIds = appeals.map((a) => a.id);
    const { data: proceedings } = await supabase
      .from("proceedings")
      .select("id")
      .in("appeal_id", appealIds);

    if (proceedings?.length) {
      const procIds = proceedings.map((p) => p.id);
      await supabase.from("events").update({ deleted_at: null }).in("proceeding_id", procIds);
      await supabase.from("proceedings").update({ deleted_at: null }).in("id", procIds);
    }

    await supabase.from("appeal_documents").update({ deleted_at: null }).in("appeal_id", appealIds);
    await supabase.from("appeals").update({ deleted_at: null }).in("id", appealIds);
  }

  await supabase.from("organizations").update({ deleted_at: null }).eq("id", orgId);

  revalidatePath("/trash");
  revalidatePath("/clients");
}

export async function restoreUser(userId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase
    .from("users")
    .update({ deleted_at: null, is_active: true })
    .eq("id", userId);

  revalidatePath("/trash");
  revalidatePath("/users");
}

export async function restoreProceeding(proceedingId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  // Restore the proceeding and all its events (cascade restore)
  await supabase.from("events").update({ deleted_at: null }).eq("proceeding_id", proceedingId);
  await supabase.from("proceedings").update({ deleted_at: null }).eq("id", proceedingId);

  revalidatePath("/trash");
  revalidatePath("/litigations");
}

export async function purgeProceeding(proceedingId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("events").delete().eq("proceeding_id", proceedingId);
  await supabase.from("proceedings").delete().eq("id", proceedingId);

  revalidatePath("/trash");
}

export async function restoreEvent(eventId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("events").update({ deleted_at: null }).eq("id", eventId);

  revalidatePath("/trash");
  revalidatePath("/litigations");
}

export async function purgeEvent(eventId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("events").delete().eq("id", eventId);

  revalidatePath("/trash");
}

export async function restoreDocument(documentId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase
    .from("appeal_documents")
    .update({ deleted_at: null })
    .eq("id", documentId);

  revalidatePath("/trash");
}

// ── PURGE (hard delete) ─────────────────────────────────

export async function purgeAppeal(appealId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  const { data: proceedings } = await supabase
    .from("proceedings")
    .select("id")
    .eq("appeal_id", appealId);

  if (proceedings?.length) {
    const procIds = proceedings.map((p) => p.id);
    await supabase.from("events").delete().in("proceeding_id", procIds);
    await supabase.from("proceedings").delete().in("id", procIds);
  }

  await supabase.from("appeal_documents").delete().eq("appeal_id", appealId);
  await supabase.from("appeals").delete().eq("id", appealId);

  revalidatePath("/trash");
}

export async function purgeClient(orgId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("compliance_details").delete().eq("org_id", orgId);
  await supabase.from("users").delete().eq("org_id", orgId);

  const { data: appeals } = await supabase
    .from("appeals")
    .select("id")
    .eq("client_org_id", orgId);

  if (appeals?.length) {
    const appealIds = appeals.map((a) => a.id);
    const { data: proceedings } = await supabase
      .from("proceedings")
      .select("id")
      .in("appeal_id", appealIds);

    if (proceedings?.length) {
      const procIds = proceedings.map((p) => p.id);
      await supabase.from("events").delete().in("proceeding_id", procIds);
      await supabase.from("proceedings").delete().in("id", procIds);
    }

    await supabase.from("appeal_documents").delete().in("appeal_id", appealIds);
    await supabase.from("appeals").delete().in("id", appealIds);
  }

  await supabase.from("organizations").delete().eq("id", orgId);

  revalidatePath("/trash");
}

export async function purgeUser(userId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("users").delete().eq("id", userId);
  await supabase.auth.admin.deleteUser(userId);

  revalidatePath("/trash");
}

export async function purgeDocument(documentId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  adminOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("appeal_documents").delete().eq("id", documentId);

  revalidatePath("/trash");
}
