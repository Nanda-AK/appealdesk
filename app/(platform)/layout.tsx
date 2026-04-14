import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import Sidebar from "@/components/layout/Sidebar";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "super_admin" && user.role !== "platform_admin") redirect("/dashboard");

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      <Sidebar
        userName={`${user.first_name} ${user.last_name}`}
        userRole={user.role}
        isPlatform
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
