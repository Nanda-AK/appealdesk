'use client'
import type { CalendarEvent, CalendarEventSourceType, ImportanceLevel } from '@/lib/calendarUtils'
import {
  IMPORTANCE_COLORS,
  IMPORTANCE_LABELS,
  groupEventsByDate,
  getDaysInMonth,
  toDateStr,
} from '@/lib/calendarUtils'

interface Props {
  events: CalendarEvent[]
  visibleTypes: CalendarEventSourceType[]
  currentDate: Date
  selectedDay?: string
  onDayClick?: (date: string) => void
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const IMPORTANCE_ORDER: ImportanceLevel[] = ['critical', 'high', 'medium', 'low']

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
                isSelected
                  ? 'bg-primary/5 ring-2 ring-inset ring-primary'
                  : isToday
                  ? 'ring-2 ring-inset ring-accent bg-accent-faint'
                  : 'hover:bg-surface-hover'
              }`}
            >
              {/* Date number */}
              <div className={`
                text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-1 flex-shrink-0
                ${isToday ? 'bg-primary text-white' : isSelected ? 'bg-primary/20 text-primary' : 'text-heading'}
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
                      style={{ background: IMPORTANCE_COLORS[level], minHeight: '16px' }}
                    >
                      <span className="text-white font-semibold truncate" style={{ fontSize: '9px' }}>
                        {IMPORTANCE_LABELS[level][0]}
                      </span>
                      <span className="text-white font-bold ml-0.5" style={{ fontSize: '9px' }}>
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
