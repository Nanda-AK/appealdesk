import { getCurrentUser } from "@/lib/user";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">
          Welcome, {user?.first_name}
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          Your appeals workspace
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm text-center text-[#6B7280]">
        Dashboard metrics coming in Phase 2.
      </div>
    </div>
  );
}
