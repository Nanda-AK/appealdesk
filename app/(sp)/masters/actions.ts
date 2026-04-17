"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export async function createSpMasterRecord(name: string, type: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  const { error } = await supabase.from("master_records").insert({
    name,
    type,
    level: "service_provider",
    service_provider_id: user.org_id,
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/masters");
}

export async function deleteSpMasterRecord(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();
  await supabase
    .from("master_records")
    .delete()
    .eq("id", id)
    .eq("service_provider_id", user.org_id)
    .eq("level", "service_provider");

  revalidatePath("/masters");
}
