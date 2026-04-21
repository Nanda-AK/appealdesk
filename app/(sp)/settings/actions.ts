"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export interface ComplianceInput {
  type: string;
  number?: string;
  login_id?: string;
  credential?: string;
  attachment_url?: string;
}

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
  country?: string;
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
      country: input.country || "India",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.org_id)
    .eq("type", "service_provider");

  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function saveSpCompliance(compliance: ComplianceInput[]) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  // Replace all compliance rows (delete + insert)
  await supabase.from("compliance_details").delete().eq("org_id", user.org_id);
  const rows = compliance.filter((c) => c.number || c.login_id || c.attachment_url);
  if (rows.length > 0) {
    await supabase.from("compliance_details").insert(
      rows.map((c) => ({ ...c, org_id: user.org_id }))
    );
  }

  revalidatePath("/settings");
}
