"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

export interface UserInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  password: string;
  role: "sp_admin" | "sp_staff" | "client";
  client_org_id?: string; // required when role = client
  designation?: string;
  department?: string;
  mobile_number?: string;
}

export async function createUser(input: UserInput) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  // Create user directly with password — no email invite
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createError) throw new Error(createError.message);

  // Determine org_id
  const orgId = input.role === "client" && input.client_org_id
    ? input.client_org_id
    : currentUser.org_id;

  // Insert public user profile
  const { error: profileError } = await supabase.from("users").insert({
    id: created.user.id,
    first_name: input.first_name,
    middle_name: input.middle_name || null,
    last_name: input.last_name,
    email: input.email,
    role: input.role,
    org_id: orgId,
    designation: input.designation || null,
    department: input.department || null,
    mobile_number: input.mobile_number || null,
    is_active: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  // For client users — create org membership record
  if (input.role === "client" && input.client_org_id) {
    await supabase.from("user_org_memberships").insert({
      user_id: created.user.id,
      org_id: input.client_org_id,
      service_provider_id: currentUser.org_id,
      is_active: true,
    });
  }

  revalidatePath("/users");
}

export async function toggleUserStatus(id: string, isActive: boolean) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "sp_admin") throw new Error("Unauthorized");
  if (id === currentUser.id) throw new Error("Cannot deactivate your own account");

  const supabase = await createServiceClient();
  await supabase
    .from("users")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/users");
}

export async function deleteUser(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "sp_admin") throw new Error("Unauthorized");
  if (id === currentUser.id) throw new Error("Cannot delete your own account");

  const supabase = await createServiceClient();

  await supabase.from("users").delete().eq("id", id);
  await supabase.auth.admin.deleteUser(id);

  revalidatePath("/users");
}
