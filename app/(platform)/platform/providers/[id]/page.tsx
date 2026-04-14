import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProviderForm from "@/components/platform/ProviderForm";

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: org }, { data: compliance }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", id).single(),
    supabase.from("compliance_details").select("*").eq("org_id", id),
  ]);

  if (!org) notFound();

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/platform/providers" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Service Providers
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">{org.name}</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Edit service provider details</p>
      </div>
      <ProviderForm mode="edit" providerId={id} initialData={org} initialCompliance={compliance ?? []} />
    </div>
  );
}
