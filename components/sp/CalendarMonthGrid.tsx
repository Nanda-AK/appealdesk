'use client'
import type { CalendarEvent, CalendarEventSourceType, ImportanceLevel } from '@/lib/calendarUtils'
import {
  IMPORTANCE_COLORS,
  IMPORTANCE_LABELS,
  groupEventsByDate,
  getDaysInMonth,
  toDateStr,
} from '@/lib/calendarUtils'
import {
  MONTH_CELL_SELECTED,
  MONTH_CELL_TODAY,
  MONTH_CELL_HOVER,
  MONTH_DATE_TODAY,
  MONTH_DATE_SELECTED,
  MONTH_DATE_DEFAULT,
  MONTH_DATE_CIRCLE_SIZE,
  MONTH_BADGE_FONT_SIZE,
  MONTH_BADGE_MIN_HEIGHT,
  IMPORTANCE_ORDER,
} from '@/lib/dashboardConfig'

interface Props {
  events: CalendarEvent[]
  visibleTypes: CalendarEventSourceType[]
  currentDate: Date
  selectedDay?: string
  onDayClick?: (date: string) => void
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarMonthGrid({ events, visibleTypes, currentDate, selectedDay, onDayClick }: Props) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = toDateStr(new Date())

  const filtered = events.filter(e => visibleTypes.includes(e.sourceType))
  const byDate = groupEventsByDate(filtered)
  const days = getDaysInMonth(year, month)

  const firstDow = new Date(year, month, 1).getDay()
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1
  const numWeeks = Math.ceil((leadingBlanks + days.length) / 7)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Importance colour legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 flex-shrink-0">
        {IMPORTANCE_ORDER.map(level => (
          <span key={level} className="flex items-center gap-1 text-xs text-secondary">
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: IMPORTANCE_COLORS[level] }} />
            {IMPORTANCE_LABELS[level]}
          </span>
        ))}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-xs font-semibold text-muted text-center py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — rows divide available height equally */}
      <div
        className="grid grid-cols-7 flex-1 border-l border-t border-border min-h-0"
        style={{ gridTemplateRows: `repeat(${numWeeks}, 1fr)` }}
      >
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="border-r border-b border-border bg-surface" />
        ))}

        {days.map(day => {
          const dateStr = toDateStr(day)
          const dayEvents = byDate.get(dateStr) ?? []
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDay

          const counts = IMPORTANCE_ORDER.reduce((acc, level) => {
            acc[level] = dayEvents.filter(e => e.importance === level).length
            return acc
          }, {} as Record<ImportanceLevel, number>)

          const activeImportances = IMPORTANCE_ORDER.filter(l => counts[l] > 0)

          return (
            <div
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={`border-r border-b border-border p-1 cursor-pointer transition overflow-hidden flex flex-col ${
                isSelected ? MONTH_CELL_SELECTED : isToday ? MONTH_CELL_TODAY : MONTH_CELL_HOVER
              }`}
            >
              {/* Date number */}
              <div className={`
                text-xs font-semibold ${MONTH_DATE_CIRCLE_SIZE} flex items-center justify-center rounded-full mb-1 flex-shrink-0
                ${isToday ? MONTH_DATE_TODAY : isSelected ? MONTH_DATE_SELECTED : MONTH_DATE_DEFAULT}
              `}>
                {day.getDate()}
              </div>

              {/* Importance counts — 2-column compact grid */}
              {activeImportances.length > 0 && (
                <div className="grid grid-cols-2 gap-0.5 flex-1 content-start">
                  {activeImportances.map(level => (
                    <div
                      key={level}
                      className="flex items-center justify-between rounded px-1 leading-none"
                      style={{ background: IMPORTANCE_COLORS[level], minHeight: MONTH_BADGE_MIN_HEIGHT }}
                    >
                      <span className="text-white font-semibold truncate" style={{ fontSize: MONTH_BADGE_FONT_SIZE }} title={IMPORTANCE_LABELS[level]}>
                        {IMPORTANCE_LABELS[level][0]}
                      </span>
                      <span className="text-white font-bold ml-0.5" style={{ fontSize: MONTH_BADGE_FONT_SIZE }}>
                        {counts[level]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
