"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export interface SpProfileInput {
  name: string;
  business_type?: string;
  date_of_incorporation?: string;
  logo_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  support_email?: string;
}

export async function updateSpProfile(input: SpProfileInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      name: input.name.trim(),
      business_type: input.business_type || null,
      date_of_incorporation: input.date_of_incorporation || null,
      logo_url: input.logo_url || null,
      address_line1: input.address_line1 || null,
      address_line2: input.address_line2 || null,
      city: input.city || null,
      state: input.state || null,
      pin_code: input.pin_code || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.org_id)
    .eq("type", "service_provider");

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
