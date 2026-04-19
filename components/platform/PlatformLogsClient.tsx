"use client";

import { useState, useMemo } from "react";

interface Log {
  id: string;
  action: string;
  entity_type: string;
  entity_label: string | null;
  created_at: string;
  service_provider_id: string | null;
  actor: { first_name: string; last_name: string; role: string } | null;
  service_provider: { name: string } | null;
}

interface Props {
  logs: Log[];
  providers: { id: string; name: string }[];
}

const ACTION_CFG: Record<string, { label: string; cls: string }> = {
  create: { label: "Created", cls: "bg-green-50 text-green-700" },
  update: { label: "Updated", cls: "bg-blue-50 text-blue-700" },
  delete: { label: "Deleted", cls: "bg-red-50 text-red-700" },
};

const ENTITY_LABELS: Record<string, string> = {
  appeal: "Appeal",
  proceeding: "Proceeding",
  event: "Event",
  document: "Document",
};

function fmtDateTime(d: string) {
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

export default function PlatformLogsClient({ logs, providers }: Props) {
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterAction && l.action !== filterAction) return false;
      if (filterEntity && l.entity_type !== filterEntity) return false;
      if (filterProvider && l.service_provider_id !== filterProvider) return false;
      if (search) {
        const actor = l.actor ? `${l.actor.first_name} ${l.actor.last_name}`.toLowerCase() : "";
        const label = (l.entity_label ?? "").toLowerCase();
        const sp = (l.service_provider?.name ?? "").toLowerCase();
        const q = search.toLowerCase();
        if (!actor.includes(q) && !label.includes(q) && !sp.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterAction, filterEntity, filterProvider, search]);

  const selCls = "px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";
  const hasFilters = filterAction || filterEntity || filterProvider || search;

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
          placeholder="Search user, record or provider…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] w-56"
        />
        <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)} className={selCls}>
          <option value="">All Providers</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className={selCls}>
          <option value="">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </select>
        <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className={selCls}>
          <option value="">All Types</option>
          <option value="appeal">Appeal</option>
          <option value="proceeding">Proceeding</option>
          <option value="event">Event</option>
          <option value="document">Document</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterAction(""); setFilterEntity(""); setFilterProvider(""); setSearch(""); }}
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
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">When</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Service Provider</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">User</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Action</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Type</th>
                <th className="text-left px-4 py-3 font-medium text-[#6B7280] whitespace-nowrap">Record</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#6B7280] text-sm">
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
                      <td className="px-4 py-3 text-[#1A1A2E] whitespace-nowrap max-w-[160px] truncate">
                        {log.service_provider?.name ?? <span className="text-[#9CA3AF]">—</span>}
                      </td>
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
                      <td className="px-4 py-3 text-[#6B7280] max-w-[240px] truncate">
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
