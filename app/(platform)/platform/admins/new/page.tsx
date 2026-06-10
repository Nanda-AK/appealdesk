import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import PlatformAdminForm from "@/components/platform/PlatformAdminForm";

export default async function NewPlatformAdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") redirect("/platform/admins");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Add Platform Admin</h1>
        <p className="text-secondary text-sm mt-0.5">Create a new platform administrator account</p>
      </div>
      <PlatformAdminForm />
    </div>
  );
}
