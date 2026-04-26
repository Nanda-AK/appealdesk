"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export interface SettingsInput {
  platform_name: string;
  description?: string;
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
      description: input.description?.trim() || null,
      logo_url: input.logo_url || null,
      support_email: input.support_email?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .not("id", "is", null); // update the single row

  if (error) throw new Error(error.message);

  revalidatePath("/login");
  revalidatePath("/platform/settings");
  revalidatePath("/platform/dashboard");
}
