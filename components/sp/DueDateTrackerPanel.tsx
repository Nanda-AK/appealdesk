import { DUE_TRACKER_BUCKETS } from '@/lib/dashboardConfig'

interface Props {
  dueToday: number
  dueIn7: number
  dueIn30: number
}

export function DueDateTrackerPanel({ dueToday, dueIn7, dueIn30 }: Props) {
  const counts: Record<(typeof DUE_TRACKER_BUCKETS)[number]['key'], number> = {
    today: dueToday,
    week: dueIn7,
    month: dueIn30,
  }
  const total = dueToday + dueIn7 + dueIn30

  return (
    <div className="bg-white border border-border rounded-xl p-2.5 h-full flex flex-col">
      <div className="flex items-baseline justify-between gap-2 mb-1.5 flex-shrink-0">
        <h3 className="text-xs font-semibold text-heading truncate">Due Date Tracker</h3>
        <span className="text-[10px] text-muted flex-shrink-0">Total Open: {total}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-1.5">
        {DUE_TRACKER_BUCKETS.map((bucket) => (
          <div key={bucket.key} className="flex items-center justify-between gap-2 text-[11px] leading-tight">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${bucket.dotCls}`} />
              <span className="text-secondary truncate" title={bucket.label}>{bucket.label}</span>
            </span>
            <span className="text-heading font-semibold whitespace-nowrap">
              {counts[bucket.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
