"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export async function createMasterRecord(name: string, type: string) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "super_admin" && user.role !== "platform_admin")) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServiceClient();

  const { error } = await supabase.from("master_records").insert({
    name,
    type,
    level: "platform",
    service_provider_id: null,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform/masters");
}

export async function toggleMasterRecord(id: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "super_admin" && user.role !== "platform_admin")) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServiceClient();
  await supabase
    .from("master_records")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/platform/masters");
}

export async function deleteMasterRecord(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();
  await supabase.from("master_records").delete().eq("id", id);

  revalidatePath("/platform/masters");
}
