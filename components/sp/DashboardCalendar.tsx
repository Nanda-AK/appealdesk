'use client'
import { useState, useEffect, useRef } from 'react'
import type { CalendarEvent, CalendarEventSourceType, ImportanceLevel } from '@/lib/calendarUtils'
import {
  loadVisibleTypes, saveVisibleTypes, getWeekDays,
  getViewDateRange, IMPORTANCE_COLORS, IMPORTANCE_LABELS, toDateStr,
} from '@/lib/calendarUtils'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import { CalendarWeekGrid } from './CalendarWeekGrid'
import { CalendarDayPanel } from './CalendarDayPanel'
import { CalendarSettingsPanel } from './CalendarSettingsPanel'

interface Props {
  events: CalendarEvent[]
}

type ViewMode = 'month' | 'week'

const IMPORTANCE_ORDER: ImportanceLevel[] = ['critical', 'high', 'medium', 'low']

function todayStr() {
  return toDateStr(new Date())
}

export function DashboardCalendar({ events }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [visibleTypes, setVisibleTypes] = useState<CalendarEventSourceType[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string>(todayStr())

  // Client filter
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  // Act filter
  const [selectedActs, setSelectedActs] = useState<string[]>([])
  const [actSearch, setActSearch] = useState('')
  const [actDropdownOpen, setActDropdownOpen] = useState(false)
  const actDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleTypes(loadVisibleTypes())
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false)
      }
      if (actDropdownRef.current && !actDropdownRef.current.contains(e.target as Node)) {
        setActDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleVisibleTypesChange(types: CalendarEventSourceType[]) {
    setVisibleTypes(types)
    saveVisibleTypes(types)
  }

  function navPrev() {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
      else d.setDate(d.getDate() - 7)
      return d
    })
  }

  function navNext() {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
      else d.setDate(d.getDate() + 7)
      return d
    })
  }

  const navLabel = viewMode === 'month'
    ? currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : (() => {
        const start = getWeekDays(currentDate)[0]
        return `Week of ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      })()

  // All unique client names
  const allClients = Array.from(new Set(events.map(e => e.clientName).filter(Boolean))).sort()
  const filteredClientOptions = allClients.filter(c =>
    c.toLowerCase().includes(clientSearch.toLowerCase()) && !selectedClients.includes(c)
  )
  function toggleClient(client: string) {
    setSelectedClients(prev => prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client])
  }

  // All unique act names
  const allActs = Array.from(new Set(events.map(e => e.actName).filter(Boolean))).sort()
  const filteredActOptions = allActs.filter(a =>
    a.toLowerCase().includes(actSearch.toLowerCase()) && !selectedActs.includes(a)
  )
  function toggleAct(act: string) {
    setSelectedActs(prev => prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act])
  }

  // Apply client + act filters
  const filteredEvents = events.filter(e => {
    if (selectedClients.length > 0 && !selectedClients.includes(e.clientName)) return false
    if (selectedActs.length > 0 && !selectedActs.includes(e.actName)) return false
    return true
  })

  // Stats: events in current view range that match visible types
  const { start: viewStart, end: viewEnd } = getViewDateRange(viewMode, currentDate)
  const viewEvents = filteredEvents.filter(e =>
    e.date >= viewStart && e.date <= viewEnd && visibleTypes.includes(e.sourceType)
  )

  const totalCount = viewEvents.length
  const importanceCounts = IMPORTANCE_ORDER.reduce((acc, level) => {
    acc[level] = viewEvents.filter(e => e.importance === level).length
    return acc
  }, {} as Record<ImportanceLevel, number>)

  const litigationCount = new Set(viewEvents.map(e => e.appealId)).size
  const uniqueClients = new Set(viewEvents.map(e => e.clientName).filter(Boolean)).size
  const assignedStaffCount = new Set(
    viewEvents.flatMap(e => e.assignedToIds ?? [])
  ).size

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Calendar main panel */}
      <div className="flex-1 bg-white border border-border rounded-xl p-4 flex flex-col min-w-0 min-h-0">

        {/* Header row */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0 gap-2 flex-wrap">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={navPrev} className="p-1 rounded hover:bg-surface-hover text-secondary transition" aria-label="Previous">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="text-sm font-semibold text-heading min-w-[180px] text-center select-none">
              {navLabel}
            </span>
            <button onClick={navNext} className="p-1 rounded hover:bg-surface-hover text-secondary transition" aria-label="Next">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Client filter */}
            <div className="relative" ref={clientDropdownRef}>
              <button
                onClick={() => { setClientDropdownOpen(o => !o); setClientSearch('') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
                  selectedClients.length > 0
                    ? 'border-primary bg-primary text-white'
                    : 'border-border text-secondary hover:bg-surface-hover'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {selectedClients.length > 0 ? `${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''}` : 'All Clients'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {clientDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-border rounded-xl shadow-lg z-40">
                  <div className="p-2 border-b border-border">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search clients…"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {selectedClients.length > 0 && (
                    <div className="px-2 pt-2 flex flex-wrap gap-1">
                      {selectedClients.map(c => (
                        <span key={c} className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                          {c}
                          <button onClick={() => toggleClient(c)} className="hover:text-danger leading-none">&times;</button>
                        </span>
                      ))}
                      <button onClick={() => setSelectedClients([])} className="text-xs text-muted hover:text-secondary underline ml-1">Clear all</button>
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredClientOptions.length === 0 && (
                      <p className="text-xs text-muted text-center py-3">{clientSearch ? 'No matches' : 'All clients selected'}</p>
                    )}
                    {filteredClientOptions.map(c => (
                      <button key={c} onClick={() => toggleClient(c)} className="w-full text-left px-3 py-1.5 text-xs text-secondary hover:bg-surface-hover transition">{c}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Act filter */}
            <div className="relative" ref={actDropdownRef}>
              <button
                onClick={() => { setActDropdownOpen(o => !o); setActSearch('') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
                  selectedActs.length > 0
                    ? 'border-primary bg-primary text-white'
                    : 'border-border text-secondary hover:bg-surface-hover'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {selectedActs.length > 0 ? `${selectedActs.length} act${selectedActs.length > 1 ? 's' : ''}` : 'All Acts'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {actDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-border rounded-xl shadow-lg z-40">
                  <div className="p-2 border-b border-border">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search acts…"
                      value={actSearch}
                      onChange={e => setActSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {selectedActs.length > 0 && (
                    <div className="px-2 pt-2 flex flex-wrap gap-1">
                      {selectedActs.map(a => (
                        <span key={a} className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                          {a}
                          <button onClick={() => toggleAct(a)} className="hover:text-danger leading-none">&times;</button>
                        </span>
                      ))}
                      <button onClick={() => setSelectedActs([])} className="text-xs text-muted hover:text-secondary underline ml-1">Clear all</button>
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filteredActOptions.length === 0 && (
                      <p className="text-xs text-muted text-center py-3">{actSearch ? 'No matches' : 'All acts selected'}</p>
                    )}
                    {filteredActOptions.map(a => (
                      <button key={a} onClick={() => toggleAct(a)} className="w-full text-left px-3 py-1.5 text-xs text-secondary hover:bg-surface-hover transition">{a}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Month / Week toggle */}
            <div className="flex bg-surface-hover rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  viewMode === 'month' ? 'bg-white shadow-sm text-heading' : 'text-secondary hover:text-heading'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  viewMode === 'week' ? 'bg-white shadow-sm text-heading' : 'text-secondary hover:text-heading'
                }`}
              >
                Week
              </button>
            </div>

            {/* Settings gear */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded hover:bg-surface-hover text-muted hover:text-secondary transition"
              title="Calendar settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar body */}
        {viewMode === 'month' ? (
          <CalendarMonthGrid
            events={filteredEvents}
            visibleTypes={visibleTypes}
            currentDate={currentDate}
            selectedDay={selectedDay}
            onDayClick={setSelectedDay}
          />
        ) : (
          <CalendarWeekGrid
            events={filteredEvents}
            visibleTypes={visibleTypes}
            currentDate={currentDate}
            selectedDay={selectedDay}
            onDayClick={setSelectedDay}
          />
        )}

        {/* Stats bar — below calendar */}
        <div className="flex items-center gap-2 mt-3 flex-shrink-0 flex-wrap border-t border-border pt-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-hover rounded-lg select-none">
            <span className="text-xs font-bold text-heading">{totalCount}</span>
            <span className="text-xs text-muted">Events</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-hover rounded-lg select-none">
            <span className="text-xs font-bold text-heading">{litigationCount}</span>
            <span className="text-xs text-muted">Litigations</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-hover rounded-lg select-none">
            <span className="text-xs font-bold text-heading">{uniqueClients}</span>
            <span className="text-xs text-muted">Clients</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-hover rounded-lg select-none">
            <span className="text-xs font-bold text-heading">{assignedStaffCount}</span>
            <span className="text-xs text-muted">Staff</span>
          </div>
          <div className="w-px h-4 bg-border mx-1" />
          {IMPORTANCE_ORDER.map(level => (
            <div key={level} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-hover select-none">
              <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: IMPORTANCE_COLORS[level] }} />
              <span className="text-xs font-bold text-heading">{importanceCounts[level]}</span>
              <span className="text-xs text-muted">{IMPORTANCE_LABELS[level]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day Events panel */}
      <div className="w-72 flex-shrink-0 bg-white border border-border rounded-xl p-4 overflow-hidden flex flex-col">
        <CalendarDayPanel
          events={filteredEvents}
          visibleTypes={visibleTypes}
          selectedDate={selectedDay}
        />
      </div>

      {/* Settings overlay */}
      {settingsOpen && (
        <CalendarSettingsPanel
          visibleTypes={visibleTypes}
          onChange={handleVisibleTypesChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
