"use client";

import { useState, useEffect, useRef } from "react";
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

interface NamedRecord { id: string; name: string; }

interface Props {
  logs: Log[];
  clients: NamedRecord[];
  totalCount: number;
  page: number;
  perPage: number;
  currentClients: string[];
  currentActions: string[];
  currentEntities: string[];
  currentFrom: string;
  currentTo: string;
}

const ACTION_CFG: Record<string, { label: string; cls: string }> = {
  create: { label: "Created", cls: "bg-green-50 text-green-700" },
  update: { label: "Updated", cls: "bg-blue-50 text-blue-700" },
  delete: { label: "Deleted", cls: "bg-red-50 text-red-700" },
};

const ENTITY_LABELS: Record<string, string> = {
  appeal:       "Litigation",
  proceeding:   "Proceeding",
  event:        "Event",
  document:     "Document",
  user:         "User",
  organization: "Organisation",
};

const ACTION_OPTIONS: NamedRecord[] = [
  { id: "create", name: "Created" },
  { id: "update", name: "Updated" },
  { id: "delete", name: "Deleted" },
];

const ENTITY_OPTIONS: NamedRecord[] = [
  { id: "appeal",       name: "Litigation" },
  { id: "proceeding",   name: "Proceeding" },
  { id: "event",        name: "Event" },
  { id: "document",     name: "Document" },
  { id: "user",         name: "User" },
  { id: "organization", name: "Organisation" },
];

function fmtDateTime(d: string) {
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
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
  const lines = rows.map((l) =>
    [
      escape(fmtDateTime(l.created_at)),
      escape(l.actor ? `${l.actor.first_name} ${l.actor.last_name}` : ""),
      escape(l.actor?.role.replace(/_/g, " ") ?? ""),
      escape(ACTION_CFG[l.action]?.label ?? l.action),
      escape(ENTITY_LABELS[l.entity_type] ?? l.entity_type),
      escape(l.entity_label ?? ""),
    ].join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

// Multi-select dropdown — buffers selections locally, applies on close.
function MultiSelect({
  options,
  values,
  onChange,
  placeholder,
  searchable = false,
}: {
  options: NamedRecord[];
  values: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  searchable?: boolean;
}) {
  const [open, setOpen]       = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [query, setQuery]     = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const pendingRef   = useRef<string[]>([]);

  function openDropdown() {
    const copy = [...values];
    setPending(copy);
    pendingRef.current = copy;
    setQuery("");
    setOpen(true);
    if (searchable) setTimeout(() => inputRef.current?.focus(), 0);
  }

  function applyAndClose() {
    onChange(pendingRef.current);
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        applyAndClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setPending((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      pendingRef.current = next;
      return next;
    });
  }

  const filtered = searchable && query
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  let triggerText: string;
  if (values.length === 0)      triggerText = placeholder;
  else if (values.length === 1) triggerText = options.find((o) => o.id === values[0])?.name ?? "1 selected";
  else                          triggerText = `${values.length} selected`;

  const hasValue = values.length > 0;
  const isMulti  = values.length > 1;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg bg-white cursor-pointer min-w-36 max-w-50 h-9.5 select-none"
        onClick={() => (open ? applyAndClose() : openDropdown())}
      >
        <span className={`flex-1 truncate ${!hasValue ? "text-[#9CA3AF]" : isMulti ? "font-medium text-[#1E3A5F]" : "text-[#1A1A2E]"}`}>
          {triggerText}
        </span>
        {hasValue ? (
          <button
            onMouseDown={(e) => { e.stopPropagation(); onChange([]); }}
            className="text-[#9CA3AF] hover:text-[#1A1A2E] shrink-0 text-base leading-none"
          >×</button>
        ) : (
          <svg className="w-3.5 h-3.5 shrink-0 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 w-56 max-h-64 flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-[#F3F4F6] shrink-0">
              <input
                ref={inputRef}
                className="w-full px-2 py-1.5 text-sm border border-[#E5E7EB] rounded focus:outline-none focus:ring-1 focus:ring-[#4A6FA5]"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          {pending.length > 0 && (
            <div className="px-3 py-1.5 border-b border-[#F3F4F6] flex items-center justify-between shrink-0">
              <span className="text-xs text-[#6B7280]">{pending.length} selected</span>
              <button
                onMouseDown={(e) => { e.preventDefault(); setPending([]); pendingRef.current = []; }}
                className="text-xs text-[#4A6FA5] hover:underline"
              >Clear</button>
            </div>
          )}
          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[#9CA3AF]">No matches</div>
            ) : (
              filtered.map((o) => {
                const isChecked = pending.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onMouseDown={(e) => { e.preventDefault(); toggle(o.id); }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#F8F9FA] ${isChecked ? "bg-blue-50/50" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isChecked ? "bg-[#1E3A5F] border-[#1E3A5F]" : "border-[#D1D5DB]"}`}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm flex-1 truncate ${isChecked ? "font-medium text-[#1A1A2E]" : "text-[#4B5563]"}`}>
                      {o.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LogsClient({
  logs, clients, totalCount, page, perPage,
  currentClients, currentActions, currentEntities, currentFrom, currentTo,
}: Props) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const totalPages  = Math.ceil(totalCount / perPage);
  const rowOffset   = (page - 1) * perPage;
  const showingFrom = totalCount === 0 ? 0 : rowOffset + 1;
  const showingTo   = Math.min(rowOffset + perPage, totalCount);
  const hasFilters  = currentClients.length > 0 || currentActions.length > 0 || currentEntities.length > 0 || currentFrom || currentTo;

  function push(updates: Record<string, string>) {
    const merged: Record<string, string> = {
      client: currentClients.join(","),
      action: currentActions.join(","),
      entity: currentEntities.join(","),
      from:   currentFrom,
      to:     currentTo,
      page:   String(page),
      ...updates,
    };
    const p = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (!v || (k === "page" && v === "1")) return;
      p.set(k, v);
    });
    router.push(`/logs${p.toString() ? `?${p.toString()}` : ""}`);
  }

  function setMultiFilter(key: string, ids: string[]) {
    push({ [key]: ids.join(","), page: "1" });
  }

  function setDateFilter(key: string, value: string) {
    push({ [key]: value, page: "1" });
  }

  function clearAll() {
    router.push("/logs");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const selectedClientNames = currentClients
        .map((id) => clients.find((c) => c.id === id)?.name)
        .filter((n): n is string => !!n);

      const data = await exportLogs({
        filterActions:      currentActions,
        filterEntities:     currentEntities,
        filterClientNames:  selectedClientNames,
        fromDate:           currentFrom,
        toDate:             currentTo,
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

  const btnPage = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg border transition ${
      active ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8F9FA]"
    }`;

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
          title={exporting ? "Exporting…" : "Export CSV"}
          className="inline-flex items-center justify-center w-9.5 h-9.5 bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-50 text-white rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      {/* Filters — Client, Date From→To, Actions, Type */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">

        {/* Client */}
        <MultiSelect
          options={clients}
          values={currentClients}
          onChange={(ids) => setMultiFilter("client", ids)}
          placeholder="All Clients"
          searchable
        />

        {/* Date range */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-2 border-[#4A6FA5] rounded-lg bg-white h-9.5">
          <span className="text-xs text-[#9CA3AF] whitespace-nowrap">From</span>
          <input
            type="date"
            value={currentFrom}
            onChange={(e) => setDateFilter("from", e.target.value)}
            className="text-sm text-[#1A1A2E] bg-transparent focus:outline-none w-32"
          />
          <span className="text-xs text-[#D1D5DB]">—</span>
          <input
            type="date"
            value={currentTo}
            onChange={(e) => setDateFilter("to", e.target.value)}
            className="text-sm text-[#1A1A2E] bg-transparent focus:outline-none w-32"
          />
          {(currentFrom || currentTo) && (
            <button
              onMouseDown={() => push({ from: "", to: "", page: "1" })}
              className="text-[#9CA3AF] hover:text-[#1A1A2E] text-base leading-none ml-1"
            >×</button>
          )}
        </div>

        {/* Actions */}
        <MultiSelect
          options={ACTION_OPTIONS}
          values={currentActions}
          onChange={(ids) => setMultiFilter("action", ids)}
          placeholder="All Actions"
        />

        {/* Type */}
        <MultiSelect
          options={ENTITY_OPTIONS}
          values={currentEntities}
          onChange={(ids) => setMultiFilter("entity", ids)}
          placeholder="All Types"
        />

        {hasFilters && (
          <button
            onClick={clearAll}
            className="px-3 py-2 text-sm text-[#6B7280] hover:text-[#1A1A2E] border border-[#E5E7EB] rounded-lg transition"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#D1D9E6] border-b-2 border-[#B0BDD0]">
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A2E]">When</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A2E]">User</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A2E]">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A2E]">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-[#1A1A2E]">Record</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[#6B7280] text-sm">
                    No log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
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
                      <td className="px-4 py-3 text-[#6B7280] max-w-70 truncate">
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
            >← Prev</button>
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
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
