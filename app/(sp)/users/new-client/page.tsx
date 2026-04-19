import Link from "next/link";
import ClientUserForm from "@/components/sp/ClientUserForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { redirect } from "next/navigation";

export default async function NewClientUserPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") redirect("/users");

  const supabase = await createClient();
  const spId = user.service_provider_id ?? user.org_id;

  const { data: clientOrgs } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("parent_sp_id", spId!)
    .eq("type", "client")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/users?tab=clients" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Users
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Add Client User</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Create a view-only user for a client organisation</p>
      </div>
      <ClientUserForm clientOrgs={clientOrgs ?? []} />
    </div>
  );
}
