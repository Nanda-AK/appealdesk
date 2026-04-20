import { getCurrentUser } from "@/lib/user";
import { redirect } from "next/navigation";
import PlatformAdminForm from "@/components/platform/PlatformAdminForm";

export default async function NewPlatformUserPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") redirect("/platform/users");

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Add Platform User</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Create a new platform admin or super admin account</p>
      </div>
      <PlatformAdminForm />
    </div>
  );
}
