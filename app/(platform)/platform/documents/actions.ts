"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

function platformOnly(role: string) {
  if (!["super_admin", "platform_admin"].includes(role)) throw new Error("Unauthorized");
}

// ── FORMS ──────────────────────────────────────────────

export interface FormInput {
  rule_no?: string;
  rule_heading: string;
  form_no?: string;
  page_no?: string;
  parallel_rule_1962?: string;
  url?: string;
}

export async function createForm(input: FormInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("forms")
    .select("sort_order")
    .is("service_provider_id", null)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("forms").insert({
    service_provider_id: null,
    rule_no: input.rule_no || null,
    rule_heading: input.rule_heading,
    form_no: input.form_no || null,
    page_no: input.page_no || null,
    parallel_rule_1962: input.parallel_rule_1962 || null,
    url: input.url || null,
    sort_order: nextOrder,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform/documents");
}

export async function updateForm(id: string, input: FormInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);
  const supabase = await createServiceClient();

  const { error } = await supabase.from("forms").update({
    rule_no: input.rule_no || null,
    rule_heading: input.rule_heading,
    form_no: input.form_no || null,
    page_no: input.page_no || null,
    parallel_rule_1962: input.parallel_rule_1962 || null,
    url: input.url || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).is("service_provider_id", null);

  if (error) throw new Error(error.message);
  revalidatePath("/platform/documents");
}

export async function deleteForm(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("forms").delete().eq("id", id).is("service_provider_id", null);
  revalidatePath("/platform/documents");
}

// ── TEMPLATES ──────────────────────────────────────────

export interface TemplateInput {
  name: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
}

export async function createTemplate(input: TemplateInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);
  const supabase = await createServiceClient();

  const { error } = await supabase.from("templates").insert({
    service_provider_id: null,
    name: input.name,
    description: input.description || null,
    file_url: input.file_url,
    file_type: input.file_type || null,
    file_size: input.file_size || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform/documents");
}

export async function updateTemplate(id: string, input: Pick<TemplateInput, "name" | "description">) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);
  const supabase = await createServiceClient();

  const { error } = await supabase.from("templates").update({
    name: input.name,
    description: input.description || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id).is("service_provider_id", null);

  if (error) throw new Error(error.message);
  revalidatePath("/platform/documents");
}

export async function deleteTemplate(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  platformOnly(user.role);
  const supabase = await createServiceClient();

  await supabase.from("templates").delete().eq("id", id).is("service_provider_id", null);
  revalidatePath("/platform/documents");
}
