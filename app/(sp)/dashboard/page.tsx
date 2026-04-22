import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import Link from "next/link";

const EVENT_LABELS: Record<string, string> = {
  notice_from_authority: "Notice from Authority",
  response_to_notice: "Response to Notice",
  adjournment_request: "Adjournment Request",
  personal_hearing: "Personal Hearing",
  virtual_hearing: "Virtual Hearing",
  personal_follow_up: "Personal Follow-up",
  assessment_order: "Assessment Order",
  notice_of_penalty: "Notice of Penalty",
  penalty_order: "Penalty Order",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(d: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(d); due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const spId = user?.service_provider_id ?? user?.org_id;
  const isClient = user?.role === "client";
  const clientOrgId = isClient ? user?.org_id : null;

  // Build appeal filter
  const appealFilter = isClient
    ? { col: "client_org_id", val: clientOrgId! }
    : { col: "service_provider_id", val: spId! };

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [
    { count: totalAppeals },
    { count: totalClients },
    { count: totalTeam },
    { data: proceedings },
    { data: recentEvents },
    { count: cntCritical },
    { count: cntHigh },
    { count: cntMedium },
    { count: cntLow },
    { count: cntFavourable },
    { count: cntDoubtful },
    { count: cntUnfavourable },
  ] = await Promise.all([
    supabase.from("appeals").select("*", { count: "exact", head: true }).eq(appealFilter.col, appealFilter.val),
    isClient
      ? Promise.resolve({ count: 0 })
      : supabase.from("organizations").select("*", { count: "exact", head: true })
          .eq("parent_sp_id", spId!).eq("type", "client").eq("is_active", true),
    isClient
      ? Promise.resolve({ count: 0 })
      : supabase.from("users").select("*", { count: "exact", head: true })
          .eq("org_id", spId!).eq("is_active", true).in("role", ["sp_admin", "sp_staff"]),
    supabase.from("proceedings").select(`
      id, importance, possible_outcome, to_be_completed_by, proceeding_type, is_active,
      assigned_user:users!assigned_to(first_name, last_name),
      appeal:appeals!appeal_id(
        id, assessment_year, financial_year, act_regulation,
        client_org:organizations!client_org_id(name)
      )
    `).eq("service_provider_id", spId!)
      .lte("to_be_completed_by", in30)
      .gte("to_be_completed_by", today)
      .order("to_be_completed_by", { ascending: true })
      .limit(10),
    supabase.from("events").select(`
      id, category, event_date, created_at,
      proceeding:proceedings!proceeding_id(
        appeal:appeals!appeal_id(
          assessment_year, act_regulation,
          client_org:organizations!client_org_id(name)
        )
      )
    `).eq("service_provider_id", spId!)
      .order("created_at", { ascending: false })
      .limit(8),
    // Importance counts — one lightweight count query per value, no rows transferred
    isClient ? Promise.resolve({ count: 0 }) : supabase.from("proceedings").select("*", { count: "exact", head: true }).eq("service_provider_id", spId!).eq("importance", "critical"),
    isClient ? Promise.resolve({ count: 0 }) : supabase.from("proceedings").select("*", { count: "exact", head: true }).eq("service_provider_id", spId!).eq("importance", "high"),
    isClient ? Promise.resolve({ count: 0 }) : supabase.from("proceedings").select("*", { count: "exact", head: true }).eq("service_provider_id", spId!).eq("importance", "medium"),
    isClient ? Promise.resolve({ count: 0 }) : supabase.from("proceedings").select("*", { count: "exact", head: true }).eq("service_provider_id", spId!).eq("importance", "low"),
    // Outcome counts
    isClient ? Promise.resolve({ count: 0 }) : supabase.from("proceedings").select("*", { count: "exact", head: true }).eq("service_provider_id", spId!).eq("possible_outcome", "favourable"),
    isClient ? Promise.resolve({ count: 0 }) : supabase.from("proceedings").select("*", { count: "exact", head: true }).eq("service_provider_id", spId!).eq("possible_outcome", "doubtful"),
    isClient ? Promise.resolve({ count: 0 }) : supabase.from("proceedings").select("*", { count: "exact", head: true }).eq("service_provider_id", spId!).eq("possible_outcome", "unfavourable"),
  ]);

  const importanceCounts = {
    critical: cntCritical ?? 0,
    high: cntHigh ?? 0,
    medium: cntMedium ?? 0,
    low: cntLow ?? 0,
  };
  const outcomeCounts = {
    favourable: cntFavourable ?? 0,
    doubtful: cntDoubtful ?? 0,
    unfavourable: cntUnfavourable ?? 0,
  };

  const upcomingDeadlines = proceedings ?? [];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">
          Welcome back, {user?.first_name}
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          {isClient ? "Here's an overview of your litigations." : "Here's an overview of your workspace."}
        </p>
      </div>

      {/* Top stat cards */}
      <div className={`grid gap-4 ${isClient ? "grid-cols-2" : "grid-cols-3"}`}>
        <Link href="/litigations"
          className="bg-[#1E3A5F] rounded-xl p-6 hover:opacity-90 transition">
          <p className="text-3xl font-bold text-white">{totalAppeals ?? 0}</p>
          <p className="text-sm mt-1 text-white/70">{isClient ? "My Litigations" : "Total Litigations"}</p>
        </Link>
        {!isClient && (
          <>
            <Link href="/clients"
              className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm hover:bg-[#F8F9FA] transition">
              <p className="text-3xl font-bold text-[#1A1A2E]">{totalClients ?? 0}</p>
              <p className="text-sm mt-1 text-[#6B7280]">Client Organisations</p>
            </Link>
            <Link href="/users"
              className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm hover:bg-[#F8F9FA] transition">
              <p className="text-3xl font-bold text-[#1A1A2E]">{totalTeam ?? 0}</p>
              <p className="text-sm mt-1 text-[#6B7280]">Team Members</p>
            </Link>
          </>
        )}
        {isClient && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
            <p className="text-3xl font-bold text-[#1A1A2E]">{upcomingDeadlines.length}</p>
            <p className="text-sm mt-1 text-[#6B7280]">Deadlines in 30 Days</p>
          </div>
        )}
      </div>

      {/* Importance & Outcome breakdown (SP only) */}
      {!isClient && (
        <div className="grid grid-cols-2 gap-4">
          {/* Importance */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">By Importance</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: "critical", label: "Critical", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
                { key: "high", label: "High", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
                { key: "medium", label: "Medium", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
                { key: "low", label: "Low", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
              ].map(({ key, label, bg, text, dot }) => (
                <div key={key} className={`${bg} rounded-lg p-3 text-center`}>
                  <p className={`text-2xl font-bold ${text}`}>{importanceCounts[key]}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <p className={`text-xs font-medium ${text}`}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">By Outcome</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "favourable", label: "Favourable", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
                { key: "doubtful", label: "Doubtful", bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
                { key: "unfavourable", label: "Unfavourable", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
              ].map(({ key, label, bg, text, dot }) => (
                <div key={key} className={`${bg} rounded-lg p-3 text-center`}>
                  <p className={`text-2xl font-bold ${text}`}>{outcomeCounts[key]}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <p className={`text-xs font-medium ${text}`}>{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Upcoming Deadlines + Recent Events */}
      <div className="grid grid-cols-2 gap-4">
        {/* Upcoming Deadlines */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#1A1A2E]">Upcoming Deadlines</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Next 30 days</p>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#9CA3AF]">No upcoming deadlines.</div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {upcomingDeadlines.map((proc: any) => {
                const days = daysUntil(proc.to_be_completed_by);
                const appeal = proc.appeal;
                const clientName = appeal?.client_org?.name ?? "—";
                const au = proc.assigned_user;
                return (
                  <div key={proc.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A2E] truncate">{clientName}</p>
                      <p className="text-xs text-[#6B7280] truncate">
                        {[appeal?.financial_year, appeal?.assessment_year].filter(Boolean).join(" / ")}
                        {appeal?.act_regulation ? ` · ${appeal.act_regulation}` : ""}
                      </p>
                      {au && (
                        <p className="text-xs text-[#9CA3AF]">{au.first_name} {au.last_name}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-[#1A1A2E]">{fmtDate(proc.to_be_completed_by)}</p>
                      <p className={`text-xs font-medium mt-0.5 ${days <= 7 ? "text-red-600" : days <= 14 ? "text-orange-500" : "text-[#6B7280]"}`}>
                        {days === 0 ? "Today" : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#1A1A2E]">Recent Activity</p>
            <p className="text-xs text-[#6B7280] mt-0.5">Latest events added</p>
          </div>
          {(recentEvents ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#9CA3AF]">No events yet.</div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {(recentEvents ?? []).map((ev: any) => {
                const appeal = ev.proceeding?.appeal;
                const clientName = appeal?.client_org?.name ?? "—";
                return (
                  <div key={ev.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-[#EEF2FF] text-[#4A6FA5] whitespace-nowrap flex-shrink-0 mt-0.5">
                      {EVENT_LABELS[ev.category] ?? ev.category}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-[#1A1A2E] font-medium truncate">{clientName}</p>
                      <p className="text-xs text-[#9CA3AF]">{fmtDate(ev.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions (SP only) */}
      {!isClient && (
        <div className="flex items-center gap-3">
          <Link href="/litigations/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Litigation
          </Link>
          <Link href="/litigations"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] text-[#1A1A2E] text-sm font-medium rounded-lg transition">
            View All Litigations
          </Link>
        </div>
      )}
    </div>
  );
}
