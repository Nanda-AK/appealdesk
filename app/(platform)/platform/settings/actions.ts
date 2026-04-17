"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export interface SettingsInput {
  platform_name: string;
  logo_url?: string;
  support_email?: string;
}

export async function updatePlatformSettings(input: SettingsInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("platform_settings")
    .update({
      platform_name: input.platform_name.trim(),
      logo_url: input.logo_url || null,
      support_email: input.support_email?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .not("id", "is", null); // update the single row

  if (error) throw new Error(error.message);

  revalidatePath("/platform/settings");
  revalidatePath("/platform/dashboard");
}
