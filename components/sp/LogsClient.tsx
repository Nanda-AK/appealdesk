"use client";

import { useState, useMemo } from "react";

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
};

function fmtDateTime(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function LogsClient({ logs }: Props) {
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterAction && l.action !== filterAction) return false;
      if (filterEntity && l.entity_type !== filterEntity) return false;
      if (search) {
        const actor = l.actor ? `${l.actor.first_name} ${l.actor.last_name}`.toLowerCase() : "";
        const label = (l.entity_label ?? "").toLowerCase();
        const q = search.toLowerCase();
        if (!actor.includes(q) && !label.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterAction, filterEntity, search]);

  const selCls = "px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Audit Log</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">{filtered.length} of {logs.length} entries</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search user or record…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-52"
        />
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className={selCls}>
          <option value="">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </select>
        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className={selCls}>
          <option value="">All Types</option>
          <option value="appeal">Litigation</option>
          <option value="proceeding">Proceeding</option>
          <option value="event">Event</option>
          <option value="document">Document</option>
        </select>
        {(filterAction || filterEntity || search) && (
          <button
            onClick={() => { setFilterAction(""); setFilterEntity(""); setSearch(""); }}
            className="px-3 py-2 text-sm text-[#6B7280] hover:text-[#1A1A2E] border border-[#E5E7EB] rounded-lg transition"
          >
            Clear
          </button>
        )}
      </div>

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
                            <p className="text-xs text-[#9CA3AF] capitalize">{actor.role.replace("_", " ")}</p>
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
    </div>
  );
}
