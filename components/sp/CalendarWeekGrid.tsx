'use client'
import { useRouter } from 'next/navigation'
import type { CalendarEvent, CalendarEventSourceType } from '@/lib/calendarUtils'
import {
  EVENT_SOURCE_COLORS,
  EVENT_SOURCE_LABELS,
  groupEventsByDate,
  getWeekDays,
  toDateStr,
} from '@/lib/calendarUtils'
import {
  WEEK_COL_BODY_TINTS,
  WEEK_COL_HEADER_TINTS,
  WEEK_SELECTED_HEADER_BG,
  WEEK_EVENT_CARD_LEFT_BORDER,
  WEEK_EVENT_CARD_PADDING,
  WEEK_COL_GAP,
  NAV_DATE_LOCALE,
} from '@/lib/dashboardConfig'

interface Props {
  events: CalendarEvent[]
  visibleTypes: CalendarEventSourceType[]
  currentDate: Date
  selectedDay?: string
  onDayClick?: (date: string) => void
}

export function CalendarWeekGrid({ events, visibleTypes, currentDate, selectedDay, onDayClick }: Props) {
  const router = useRouter()
  const today = toDateStr(new Date())
  const weekDays = getWeekDays(currentDate)
  const filtered = events.filter(e => visibleTypes.includes(e.sourceType))
  const byDate = groupEventsByDate(filtered)

  return (
    <div className={`grid grid-cols-7 ${WEEK_COL_GAP} flex-1 min-h-0`}>
      {weekDays.map((day, i) => {
        const dateStr = toDateStr(day)
        const dayEvents = byDate.get(dateStr) ?? []
        const dayName = day.toLocaleDateString(NAV_DATE_LOCALE, { weekday: 'short' }).toUpperCase()
        const dayLabel = day.toLocaleDateString(NAV_DATE_LOCALE, { day: 'numeric', month: 'short' })
        const isToday = dateStr === today
        const isSelected = dateStr === selectedDay

        return (
          <div
            key={dateStr}
            className={`flex flex-col rounded-lg overflow-hidden border transition ${
              isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
            }`}
          >
            <div
              className="text-center py-2 border-b border-border flex-shrink-0 cursor-pointer hover:opacity-80 transition"
              style={{ background: isSelected ? WEEK_SELECTED_HEADER_BG : WEEK_COL_HEADER_TINTS[i] }}
              onClick={() => onDayClick?.(dateStr)}
            >
              <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-heading'}`}>{dayName}</p>
              <p className={`text-xs font-semibold ${isSelected ? 'text-white' : isToday ? 'text-primary font-bold' : 'text-secondary'}`}>
                {dayLabel}
              </p>
            </div>
            <div
              className="flex-1 overflow-y-auto p-1.5 space-y-1.5 min-h-0"
              style={{ background: WEEK_COL_BODY_TINTS[i] }}
            >
              {dayEvents.map(event => (
                <button
                  key={`${event.sourceType}-${event.id}`}
                  onClick={() => router.push(`/litigations/${event.appealId}`)}
                  className={`w-full text-left rounded bg-white border border-border text-xs ${WEEK_EVENT_CARD_PADDING} hover:shadow-sm transition`}
                  style={{ borderLeftColor: EVENT_SOURCE_COLORS[event.sourceType], borderLeftWidth: WEEK_EVENT_CARD_LEFT_BORDER }}
                >
                  <p className="font-semibold text-heading mb-0.5 leading-tight">
                    {EVENT_SOURCE_LABELS[event.sourceType]}
                  </p>
                  <p className="text-secondary truncate" title={event.clientName}>{event.clientName}</p>
                  <p className="text-muted truncate" title={event.proceedingType}>{event.proceedingType}</p>
                  {event.financialYear && (
                    <p className="text-muted">FY: {event.financialYear}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
