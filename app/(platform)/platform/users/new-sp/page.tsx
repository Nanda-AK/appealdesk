import { getCurrentUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PlatformSpUserForm from "@/components/platform/PlatformSpUserForm";

export default async function NewSpUserPage() {
  const user = await getCurrentUser();
  if (!user || !["super_admin", "platform_admin"].includes(user.role)) redirect("/platform/users");

  const supabase = await createClient();
  const { data: providers } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("type", "service_provider")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/platform/users" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Users
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Add SP Admin</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Create a new admin account for a service provider</p>
      </div>
      <PlatformSpUserForm providers={providers ?? []} />
    </div>
  );
}
