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
  state?: string;
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
      state: input.state || null,
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
      state: input.state || null,
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

export interface SpAdminInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  password: string;
  designation?: string;
}

export async function createSpAdmin(spId: string, input: SpAdminInput) {
  const user = await getCurrentUser();
  if (!user || !isPlatformRole(user.role)) throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  // Verify the SP exists
  const { data: sp } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", spId)
    .eq("type", "service_provider")
    .single();

  if (!sp) throw new Error("Service provider not found");

  // Create user directly with password — no email invite needed
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // Mark email as confirmed, skip verification
  });

  if (createError) throw new Error(createError.message);

  const { error: profileError } = await supabase.from("users").insert({
    id: created.user.id,
    first_name: input.first_name,
    middle_name: input.middle_name || null,
    last_name: input.last_name,
    email: input.email,
    role: "sp_admin",
    org_id: spId,
    designation: input.designation || null,
    is_active: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/platform/providers");
}

export async function deleteSpAdmin(userId: string, spId: string) {
  const user = await getCurrentUser();
  if (!user || !isPlatformRole(user.role)) throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  // Delete from public users table first
  await supabase.from("users").delete().eq("id", userId).eq("org_id", spId).eq("role", "sp_admin");

  // Delete from Supabase Auth
  await supabase.auth.admin.deleteUser(userId);

  revalidatePath("/platform/providers");
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
