"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ComplianceInput {
  type: "pan" | "aadhaar" | "tan" | "gst";
  number?: string;
  login_id?: string;
  credential?: string;
  attachment_url?: string;
}

export interface ClientInput {
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

export async function createClientOrg(input: ClientInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: input.name,
      type: "client",
      parent_sp_id: user.org_id,
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

  const complianceRows = input.compliance.filter(
    (c) => c.number || c.login_id || c.attachment_url
  );
  if (complianceRows.length > 0) {
    await supabase.from("compliance_details").insert(
      complianceRows.map((c) => ({ ...c, org_id: org.id }))
    );
  }

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClientOrg(id: string, input: ClientInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

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
    .eq("id", id)
    .eq("parent_sp_id", user.org_id); // ensure SP owns this client

  if (error) throw new Error(error.message);

  for (const c of input.compliance) {
    if (c.number || c.login_id || c.attachment_url) {
      await supabase.from("compliance_details").upsert(
        { ...c, org_id: id },
        { onConflict: "org_id,type" }
      );
    }
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect("/clients");
}

export async function toggleClientStatus(id: string, isActive: boolean) {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();

  await supabase
    .from("organizations")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("parent_sp_id", user.org_id);

  revalidatePath("/clients");
}
