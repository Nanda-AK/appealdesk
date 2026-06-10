import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import Link from "next/link";
import ProvidersClient from "@/components/platform/ProvidersClient";

export default async function ProvidersPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: providers } = await supabase
    .from("organizations")
    .select("id, name, business_type, city, is_active, created_at")
    .eq("type", "service_provider")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Service Providers</h1>
          <p className="text-secondary text-sm mt-0.5">
            {providers?.length ?? 0} registered service providers
          </p>
        </div>
        <Link
          href="/platform/providers/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Service Provider
        </Link>
      </div>
      <ProvidersClient providers={providers ?? []} userRole={user!.role} />
    </div>
  );
}
