import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import Link from "next/link";
import ClientsClient from "@/components/sp/ClientsClient";

export default async function ClientsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const spId = user?.service_provider_id ?? user?.org_id;

  const { data: clients } = await supabase
    .from("organizations")
    .select("id, name, business_type, city, is_active, created_at")
    .eq("parent_sp_id", spId!)
    .eq("type", "client")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">Clients</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{clients?.length ?? 0} client organizations</p>
        </div>
        {user?.role === "sp_admin" && (
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </Link>
        )}
      </div>
      <ClientsClient clients={clients ?? []} isAdmin={user?.role === "sp_admin"} />
    </div>
  );
}
