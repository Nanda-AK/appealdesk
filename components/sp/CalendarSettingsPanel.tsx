'use client'
import type { CalendarEventSourceType } from '@/lib/calendarUtils'
import { EVENT_SOURCE_LABELS, EVENT_SOURCE_COLORS, ALL_SOURCE_TYPES } from '@/lib/calendarUtils'
import {
  SETTINGS_PANEL_WIDTH,
  SETTINGS_PANEL_TOP,
  SETTINGS_PANEL_RIGHT,
  SETTINGS_PANEL_MAX_HEIGHT,
} from '@/lib/dashboardConfig'

const GROUPS: { label: string; types: CalendarEventSourceType[] }[] = [
  { label: 'Proceedings Dates', types: ['deadline', 'initiated_on'] },
  { label: 'Hearings', types: ['personal_hearing', 'virtual_hearing'] },
  { label: 'Notices', types: ['notice_from_authority', 'show_cause_notice', 'notice_of_penalty'] },
  { label: 'Responses & Filings', types: ['response_to_notice', 'filing_of_appeal'] },
  { label: 'Orders', types: ['assessment_order', 'penalty_order'] },
  { label: 'Limitation', types: ['limitation'] },
  { label: 'Other', types: ['adjournment_request', 'personal_follow_up', 'others'] },
]

interface Props {
  visibleTypes: CalendarEventSourceType[]
  onChange: (types: CalendarEventSourceType[]) => void
  onClose: () => void
}

export function CalendarSettingsPanel({ visibleTypes, onChange, onClose }: Props) {
  function toggle(type: CalendarEventSourceType) {
    const next = visibleTypes.includes(type)
      ? visibleTypes.filter(t => t !== type)
      : [...visibleTypes, type]
    onChange(next)
  }

  const allSelected = ALL_SOURCE_TYPES.every(t => visibleTypes.includes(t))
  const noneSelected = visibleTypes.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className={`${SETTINGS_PANEL_TOP} ${SETTINGS_PANEL_RIGHT} ${SETTINGS_PANEL_WIDTH} bg-white border border-border rounded-xl shadow-lg p-5 ${SETTINGS_PANEL_MAX_HEIGHT} overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-heading">Calendar Settings</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-heading text-xl leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-secondary mb-3">
          Choose which date types appear on the calendar and upcoming events list.
        </p>

        {/* Select All / Unselect All */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onChange([...ALL_SOURCE_TYPES])}
            disabled={allSelected}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border text-secondary hover:bg-surface-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <button
            onClick={() => onChange([])}
            disabled={noneSelected}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border text-secondary hover:bg-surface-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Unselect All
          </button>
        </div>

        {GROUPS.map(group => (
          <div key={group.label} className="mb-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              {group.label}
            </p>
            {group.types.map(type => (
              <label key={type} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleTypes.includes(type)}
                  onChange={() => toggle(type)}
                  className="rounded border-border accent-primary"
                />
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: EVENT_SOURCE_COLORS[type] }}
                />
                <span className="text-sm text-secondary">{EVENT_SOURCE_LABELS[type]}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
