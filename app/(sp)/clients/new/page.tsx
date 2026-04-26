import Link from "next/link";
import ClientForm from "@/components/sp/ClientForm";
import { createClient } from "@/lib/supabase/server";

export default async function NewClientPage() {
  const supabase = await createClient();
  const { data: btRecords } = await supabase
    .from("master_records")
    .select("name")
    .eq("type", "business_type")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  const businessTypes = (btRecords ?? []).map((r) => r.name);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Add Client</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Onboard a new client organization</p>
      </div>
      <ClientForm mode="create" businessTypes={businessTypes} />
    </div>
  );
}
