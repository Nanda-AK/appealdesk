"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

function platformOnly(role: string) {
  if (!["super_admin", "platform_admin"].includes(role)) throw new Error("Unauthorized");
}

export async function restorePlatformUser(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);

  const supabase = await createServiceClient();
  await supabase.from("users").update({ deleted_at: null, is_active: true }).eq("id", id);

  revalidatePath("/platform/recycle-bin");
  revalidatePath("/platform/users");
  revalidatePath("/platform/providers");
}

export async function purgePlatformUser(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);

  const supabase = await createServiceClient();
  await supabase.from("users").delete().eq("id", id);
  await supabase.auth.admin.deleteUser(id);

  revalidatePath("/platform/recycle-bin");
  revalidatePath("/platform/users");
  revalidatePath("/platform/providers");
}

export async function restoreMasterRecord(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);

  const supabase = await createServiceClient();
  // Restore children first, then the record itself
  await supabase.from("master_records").update({ deleted_at: null, is_active: true }).eq("parent_id", id);
  await supabase.from("master_records").update({ deleted_at: null, is_active: true }).eq("id", id);

  revalidatePath("/platform/recycle-bin");
  revalidatePath("/platform/masters");
}

export async function purgeMasterRecord(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);

  const supabase = await createServiceClient();
  // Delete children first, then the record
  await supabase.from("master_records").delete().eq("parent_id", id);
  await supabase.from("master_records").delete().eq("id", id);

  revalidatePath("/platform/recycle-bin");
  revalidatePath("/platform/masters");
}
