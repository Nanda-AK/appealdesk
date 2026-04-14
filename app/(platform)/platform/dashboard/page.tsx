import { getCurrentUser } from "@/lib/user";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformDashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ count: spCount }, { count: userCount }, { count: appealCount }] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }).eq("type", "service_provider"),
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("appeals").select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Service Providers", value: spCount ?? 0 },
    { label: "Total Users", value: userCount ?? 0 },
    { label: "Total Appeals", value: appealCount ?? 0 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">
          Welcome, {user?.first_name}
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="text-3xl font-bold text-[#1E3A5F]">{card.value}</p>
            <p className="text-sm text-[#6B7280] mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
