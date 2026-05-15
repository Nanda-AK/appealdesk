"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { exportLogs } from "@/app/(sp)/logs/actions";

interface Log {
  id: string;
  action: string;
  entity_type: string;
  entity_label: string | null;
  created_at: string;
  actor: { first_name: string; last_name: string; role: string } | null;
}

interface Props {
  logs: Log[];
  totalCount: number;
  page: number;
  perPage: number;
  currentAction: string;
  currentEntity: string;
  currentFrom: string;
  currentTo: string;
}

const ACTION_CFG: Record<string, { label: string; cls: string }> = {
  create: { label: "Created", cls: "bg-green-50 text-green-700" },
  update: { label: "Updated", cls: "bg-blue-50 text-blue-700" },
  delete: { label: "Deleted", cls: "bg-red-50 text-red-700" },
};

const ENTITY_LABELS: Record<string, string> = {
  appeal: "Litigation",
  proceeding: "Proceeding",
  event: "Event",
  document: "Document",
  user: "User",
  organization: "Organisation",
};

function fmtDateTime(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function toCSV(rows: Log[]): string {
  const header = ["Date/Time", "User", "Role", "Action", "Type", "Record"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((l) => [
    escape(fmtDateTime(l.created_at)),
    escape(l.actor ? `${l.actor.first_name} ${l.actor.last_name}` : ""),
    escape(l.actor?.role.replace(/_/g, " ") ?? ""),
    escape(ACTION_CFG[l.action]?.label ?? l.action),
    escape(ENTITY_LABELS[l.entity_type] ?? l.entity_type),
    escape(l.entity_label ?? ""),
  ].join(","));
  return [header.join(","), ...lines].join("\n");
}

export default function LogsClient({
  logs, totalCount, page, perPage,
  currentAction, currentEntity, currentFrom, currentTo,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.ceil(totalCount / perPage);
  const rowOffset = (page - 1) * perPage;
  const showingFrom = totalCount === 0 ? 0 : rowOffset + 1;
  const showingTo = Math.min(rowOffset + perPage, totalCount);
  const hasFilters = currentAction || currentEntity || currentFrom || currentTo;

  function push(updates: Record<string, string>) {
    const merged: Record<string, string> = {
      action: currentAction,
      entity: currentEntity,
      from: currentFrom,
      to: currentTo,
      page: String(page),
      ...updates,
    };
    const p = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (!v || (k === "page" && v === "1")) return;
      p.set(k, v);
    });
    router.push(`/logs${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function setFilter(key: string, value: string) {
    push({ [key]: value, page: "1" });
  }

  function clearAll() {
    setSearch("");
    router.push("/logs");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportLogs({
        filterAction: currentAction,
        filterEntity: currentEntity,
        fromDate: currentFrom,
        toDate: currentTo,
      });
      const csv = toCSV(data as unknown as Log[]);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // Client-side text search on the current page
  const filtered = useMemo(() => {
    if (!search) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => {
      const actor = l.actor ? `${l.actor.first_name} ${l.actor.last_name}`.toLowerCase() : "";
      const label = (l.entity_label ?? "").toLowerCase();
      return actor.includes(q) || label.includes(q);
    });
  }, [logs, search]);

  const selCls = "px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";
  const btnPage = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg border transition ${active ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8F9FA]"}`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">Audit Log</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {totalCount > 0 ? `Showing ${showingFrom}–${showingTo} of ${totalCount} entries` : "No entries"}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || totalCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search user or record…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-48"
        />
        <select value={currentAction} onChange={(e) => setFilter("action", e.target.value)} className={selCls}>
          <option value="">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </select>
        <select value={currentEntity} onChange={(e) => setFilter("entity", e.target.value)} className={selCls}>
          <option value="">All Types</option>
          <option value="appeal">Litigation</option>
          <option value="proceeding">Proceeding</option>
          <option value="event">Event</option>
          <option value="document">Document</option>
          <option value="user">User</option>
          <option value="organization">Organisation</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280]">From</span>
          <input
            type="date"
            value={currentFrom}
            onChange={(e) => setFilter("from", e.target.value)}
            className="px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280]">To</span>
          <input
            type="date"
            value={currentTo}
            onChange={(e) => setFilter("to", e.target.value)}
            className="px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
          />
        </div>
        {(hasFilters || search) && (
          <button
            onClick={clearAll}
            className="px-3 py-2 text-sm text-[#6B7280] hover:text-[#1A1A2E] border border-[#E5E7EB] rounded-lg transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">When</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">User</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Action</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280]">Record</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#6B7280] text-sm">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const actionCfg = ACTION_CFG[log.action] ?? { label: log.action, cls: "bg-gray-100 text-gray-600" };
                  const actor = log.actor;
                  return (
                    <tr key={log.id} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap text-xs">{fmtDateTime(log.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {actor ? (
                          <div>
                            <p className="font-medium text-[#1A1A2E]">{actor.first_name} {actor.last_name}</p>
                            <p className="text-xs text-[#9CA3AF] capitalize">{actor.role.replace(/_/g, " ")}</p>
                          </div>
                        ) : <span className="text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionCfg.cls}`}>
                          {actionCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] max-w-[280px] truncate">
                        {log.entity_label ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm text-[#6B7280]">
            Showing {showingFrom}–{showingTo} of {totalCount} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => push({ page: String(page - 1) })}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8F9FA] disabled:opacity-40 transition"
            >
              ← Prev
            </button>
            {pageNumbers(page, totalPages).map((n, i) =>
              n === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-[#9CA3AF]">…</span>
              ) : (
                <button key={n} onClick={() => push({ page: String(n) })} className={btnPage(n === page)}>
                  {n}
                </button>
              )
            )}
            <button
              onClick={() => push({ page: String(page + 1) })}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8F9FA] disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
