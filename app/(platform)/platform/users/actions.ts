"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

function platformOnly(role: string) {
  if (!["super_admin", "platform_admin"].includes(role)) throw new Error("Unauthorized");
}

export interface SpAdminFullInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  password: string;
  // Contact
  mobile_country_code?: string;
  mobile_number?: string;
  date_of_birth?: string;
  // Employment
  department?: string;
  designation?: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  pin_code?: string;
  location?: string;
  // Identity
  pan_number?: string;
  pan_attachment?: string;
  aadhar_number?: string;
  aadhar_attachment?: string;
  // Avatar
  avatar_url?: string;
}

export async function createPlatformSpAdmin(spId: string, input: SpAdminFullInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);

  const supabase = await createServiceClient();

  // Verify SP exists
  const { data: sp } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", spId)
    .eq("type", "service_provider")
    .single();

  if (!sp) throw new Error("Service provider not found");

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);

  // Insert user profile
  const { error: profileError } = await supabase.from("users").insert({
    id: authData.user.id,
    first_name: input.first_name,
    middle_name: input.middle_name || null,
    last_name: input.last_name,
    email: input.email,
    role: "sp_admin",
    org_id: spId,
    mobile_country_code: input.mobile_country_code || "+91",
    mobile_number: input.mobile_number || null,
    date_of_birth: input.date_of_birth || null,
    department: input.department || null,
    designation: input.designation || null,
    date_of_joining: input.date_of_joining || null,
    date_of_leaving: input.date_of_leaving || null,
    address_line1: input.address_line1 || null,
    address_line2: input.address_line2 || null,
    city: input.city || null,
    pin_code: input.pin_code || null,
    location: input.location || null,
    pan_number: input.pan_number || null,
    pan_attachment: input.pan_attachment || null,
    aadhar_number: input.aadhar_number || null,
    aadhar_attachment: input.aadhar_attachment || null,
    avatar_url: input.avatar_url || null,
    is_active: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/platform/users");
  revalidatePath("/platform/providers");
}

export async function toggleSpAdminStatus(id: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);

  const supabase = await createServiceClient();
  await supabase
    .from("users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/platform/users");
}

export async function deletePlatformSpAdmin(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);

  const supabase = await createServiceClient();
  await supabase.from("users").delete().eq("id", id);
  await supabase.auth.admin.deleteUser(id);

  revalidatePath("/platform/users");
  revalidatePath("/platform/providers");
}
