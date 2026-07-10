"use client";

import { useState, useEffect, useRef } from "react";

export interface NamedRecord {
  id: string;
  name: string;
}

// Multi-select dropdown with checkboxes and optional search.
// Selections are buffered locally and applied (pushed to URL) when the dropdown closes.
export function MultiSelect({
  options,
  values,
  onChange,
  placeholder,
  searchable = true,
}: {
  options: NamedRecord[];
  values: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref so the click-outside handler always sees the latest pending without restating the effect
  const pendingRef = useRef<string[]>([]);

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
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        applyAndClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setPending((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      pendingRef.current = next;
      return next;
    });
  }

  const filtered =
    searchable && query
      ? options.filter((o) =>
          o.name.toLowerCase().includes(query.toLowerCase()),
        )
      : options;

  // Trigger label
  let triggerText: string;
  if (values.length === 0) triggerText = placeholder;
  else if (values.length === 1)
    triggerText = options.find((o) => o.id === values[0])?.name ?? "1 selected";
  else triggerText = `${values.length} selected`;

  const hasValue = values.length > 0;
  const isMulti = values.length > 1;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-2 text-sm border border-accent rounded-lg bg-white cursor-pointer min-w-25 max-w-32.5 h-9.5 select-none"
        onClick={() => (open ? applyAndClose() : openDropdown())}
      >
        <span
          className={`flex-1 truncate ${
            !hasValue
              ? "text-muted"
              : isMulti
                ? "font-medium text-primary"
                : "text-heading"
          }`}
        >
          {triggerText}
        </span>
        {hasValue ? (
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="text-muted hover:text-heading shrink-0 text-base leading-none"
          >
            ×
          </button>
        ) : (
          <svg
            className="w-3.5 h-3.5 shrink-0 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 w-60 max-h-64 flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-surface-hover shrink-0">
              <input
                ref={inputRef}
                className="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          {pending.length > 0 && (
            <div className="px-3 py-1.5 border-b border-surface-hover flex items-center justify-between shrink-0">
              <span className="text-xs text-secondary">
                {pending.length} selected
              </span>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setPending([]);
                  pendingRef.current = [];
                }}
                className="text-xs text-accent hover:underline"
              >
                Clear
              </button>
            </div>
          )}
          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted">No matches</div>
            ) : (
              filtered.map((o) => {
                const isChecked = pending.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(o.id);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-page ${isChecked ? "bg-accent-light" : ""}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                        isChecked
                          ? "bg-primary border-primary"
                          : "border-border-strong"
                      }`}
                    >
                      {isChecked && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm flex-1 truncate ${isChecked ? "font-medium text-heading" : "text-secondary"}`}
                    >
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
