import Link from "next/link";
import ProviderForm from "@/components/platform/ProviderForm";

export default function NewProviderPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/platform/providers" className="text-sm text-secondary hover:text-heading flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Service Providers
        </Link>
        <h1 className="text-2xl font-semibold text-heading">Add Service Provider</h1>
        <p className="text-secondary text-sm mt-0.5">Onboard a new entity to the platform</p>
      </div>
      <ProviderForm mode="create" />
    </div>
  );
}
