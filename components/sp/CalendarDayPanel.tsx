'use client'
import { useRouter } from 'next/navigation'
import type { CalendarEvent, CalendarEventSourceType } from '@/lib/calendarUtils'
import { EVENT_SOURCE_LABELS, EVENT_SOURCE_COLORS } from '@/lib/calendarUtils'
import { DAY_PANEL_CARD_LEFT_BORDER, DAY_PANEL_CARD_PADDING, NAV_DATE_LOCALE } from '@/lib/dashboardConfig'

interface Props {
  events: CalendarEvent[]
  visibleTypes: CalendarEventSourceType[]
  selectedDate: string  // YYYY-MM-DD
}

export function CalendarDayPanel({ events, visibleTypes, selectedDate }: Props) {
  const router = useRouter()

  const dayEvents = events.filter(e =>
    e.date === selectedDate && visibleTypes.includes(e.sourceType)
  )

  const [y, m, d] = selectedDate.split('-').map(Number)
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString(NAV_DATE_LOCALE, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const isToday = selectedDate === (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })()

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-1 flex-shrink-0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent flex-shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h3 className="text-sm font-semibold text-heading">Day Events</h3>
        {dayEvents.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-white bg-primary rounded-full px-2 py-0.5">
            {dayEvents.length}
          </span>
        )}
      </div>
      <p className={`text-xs mb-3 flex-shrink-0 ${isToday ? 'text-primary font-semibold' : 'text-muted'}`}>
        {isToday ? 'Today — ' : ''}{dateLabel}
      </p>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {dayEvents.length === 0 && (
          <p className="text-xs text-muted py-6 text-center">
            No events for this day.
          </p>
        )}
        {dayEvents.map(event => (
          <button
            key={`${event.sourceType}-${event.id}`}
            onClick={() => router.push(`/litigations/${event.appealId}`)}
            className={`w-full text-left rounded-lg bg-white border border-border ${DAY_PANEL_CARD_PADDING} hover:shadow-sm transition`}
            style={{ borderLeftColor: EVENT_SOURCE_COLORS[event.sourceType], borderLeftWidth: DAY_PANEL_CARD_LEFT_BORDER }}
          >
            <p className="text-xs font-semibold text-heading leading-tight mb-0.5">
              {EVENT_SOURCE_LABELS[event.sourceType]}
            </p>
            <p className="text-xs text-secondary truncate" title={event.clientName}>{event.clientName}</p>
            {event.proceedingType && (
              <p className="text-xs text-muted truncate" title={event.proceedingType}>{event.proceedingType}</p>
            )}
            {event.actName && (
              <p className="text-xs text-muted truncate" title={event.actName}>{event.actName}</p>
            )}
            {event.financialYear && (
              <p className="text-xs text-muted">FY: {event.financialYear}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
