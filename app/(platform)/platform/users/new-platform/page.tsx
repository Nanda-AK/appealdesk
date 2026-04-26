import { getCurrentUser } from "@/lib/user";
import { redirect } from "next/navigation";
import Link from "next/link";
import PlatformAdminForm from "@/components/platform/PlatformAdminForm";

export default async function NewPlatformUserPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") redirect("/platform/users");

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/platform/users" className="text-sm text-[#6B7280] hover:text-[#1A1A2E] flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Users
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Add Platform User</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Create a new platform admin or super admin account</p>
      </div>
      <PlatformAdminForm />
    </div>
  );
}
