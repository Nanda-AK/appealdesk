import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import DocumentsClient from "@/components/sp/DocumentsClient";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const spId = user?.service_provider_id ?? user?.org_id;

  const { data: documents } = await supabase
    .from("appeal_documents")
    .select(`
      id, file_name, file_url, file_size, created_at,
      uploaded_by_user:users!uploaded_by(first_name, last_name),
      appeal:appeals!appeal_id(
        id, assessment_year, financial_year, act_regulation,
        client_org:organizations!client_org_id(name)
      )
    `)
    .eq("service_provider_id", spId!)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <DocumentsClient
        documents={(documents ?? []) as any}
        canEdit={user?.role === "sp_admin" || user?.role === "sp_staff"}
      />
    </div>
  );
}
