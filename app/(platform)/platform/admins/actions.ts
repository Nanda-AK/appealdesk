"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export interface AdminInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  password: string;
  role: "super_admin" | "platform_admin";
  avatar_url?: string;
}

export async function createPlatformAdmin(input: AdminInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

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
    role: input.role,
    org_id: "00000000-0000-0000-0000-000000000001", // Platform org
    avatar_url: input.avatar_url || null,
    is_active: true,
  });

  if (profileError) {
    // Rollback auth user if profile insert fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  revalidatePath("/platform/admins");
}

export async function toggleAdminStatus(id: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") throw new Error("Unauthorized");
  if (id === user.id) throw new Error("Cannot deactivate your own account");

  const supabase = await createServiceClient();

  await supabase
    .from("users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/platform/admins");
}
