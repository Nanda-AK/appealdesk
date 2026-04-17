"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";

function spOnly(role: string) {
  if (!["sp_admin", "sp_staff"].includes(role)) throw new Error("Unauthorized");
}

export async function addDocument(appealId: string, fileName: string, fileUrl: string, fileSize: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const spId = user.service_provider_id ?? user.org_id;
  const supabase = await createServiceClient();

  const { error } = await supabase.from("appeal_documents").insert({
    appeal_id: appealId,
    service_provider_id: spId,
    file_name: fileName,
    file_url: fileUrl,
    file_size: fileSize,
    uploaded_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/appeals/${appealId}`);
  revalidatePath("/documents");
}

export async function deleteDocument(documentId: string, appealId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  spOnly(user.role);
  const supabase = await createServiceClient();

  const { error } = await supabase.from("appeal_documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/appeals/${appealId}`);
  revalidatePath("/documents");
}
