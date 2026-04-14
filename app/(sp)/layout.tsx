import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import Sidebar from "@/components/layout/Sidebar";

export default async function SpLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Platform admins should not access SP workspace
  if (user.role === "super_admin" || user.role === "platform_admin") {
    redirect("/platform/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      <Sidebar
        userName={`${user.first_name} ${user.last_name}`}
        userRole={user.role}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
