"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

function isPlatformRole(role: string) {
  return role === "super_admin" || role === "platform_admin";
}

export interface ComplianceInput {
  type: "pan" | "aadhaar" | "tan" | "gst";
  number?: string;
  login_id?: string;
  credential?: string;
  attachment_url?: string;
}

export interface ProviderInput {
  name: string;
  business_type?: string;
  date_of_incorporation?: string;
  logo_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  pin_code?: string;
  compliance: ComplianceInput[];
}

export async function createProvider(input: ProviderInput) {
  const user = await getCurrentUser();
  if (!user || !isPlatformRole(user.role)) throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: input.name,
      type: "service_provider",
      business_type: input.business_type || null,
      date_of_incorporation: input.date_of_incorporation || null,
      logo_url: input.logo_url || null,
      address_line1: input.address_line1 || null,
      address_line2: input.address_line2 || null,
      city: input.city || null,
      pin_code: input.pin_code || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Insert compliance details
  const complianceRows = input.compliance.filter(
    (c) => c.number || c.login_id || c.attachment_url
  );
  if (complianceRows.length > 0) {
    await supabase.from("compliance_details").insert(
      complianceRows.map((c) => ({ ...c, org_id: org.id }))
    );
  }

  revalidatePath("/platform/providers");
  return { id: org.id };
}

export async function updateProvider(id: string, input: ProviderInput) {
  const user = await getCurrentUser();
  if (!user || !isPlatformRole(user.role)) throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      name: input.name,
      business_type: input.business_type || null,
      date_of_incorporation: input.date_of_incorporation || null,
      logo_url: input.logo_url || null,
      address_line1: input.address_line1 || null,
      address_line2: input.address_line2 || null,
      city: input.city || null,
      pin_code: input.pin_code || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Upsert compliance details
  for (const c of input.compliance) {
    if (c.number || c.login_id || c.attachment_url) {
      await supabase.from("compliance_details").upsert(
        { ...c, org_id: id },
        { onConflict: "org_id,type" }
      );
    }
  }

  revalidatePath("/platform/providers");
  revalidatePath(`/platform/providers/${id}`);
}

export async function toggleProviderStatus(id: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user || !isPlatformRole(user.role)) throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  await supabase
    .from("organizations")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  // Also toggle all users under this SP
  await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("org_id", id);

  revalidatePath("/platform/providers");
}
