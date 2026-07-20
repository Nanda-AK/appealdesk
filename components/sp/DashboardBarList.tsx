interface BarDatum {
  label: string
  value: number
  color?: string
}

interface Props {
  title: string
  subtitle?: string
  data: BarDatum[]
  barColorCls?: string
  emptyLabel?: string
}

export function DashboardBarList({
  title,
  subtitle,
  data,
  barColorCls = 'bg-primary',
  emptyLabel = 'No data yet.',
}: Props) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="bg-white border border-border rounded-xl p-2.5 h-full flex flex-col">
      <div className="mb-1.5 flex-shrink-0">
        <h3 className="text-xs font-semibold text-heading">{title}</h3>
        {subtitle && <span className="text-[10px] text-muted">{subtitle}</span>}
      </div>
      {data.length === 0 ? (
        <p className="flex-1 flex items-center justify-center text-xs text-muted text-center">{emptyLabel}</p>
      ) : (
        <div className="flex-1 flex flex-col justify-center space-y-1">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 w-24 flex-shrink-0 min-w-0" title={d.label}>
                {d.color && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: d.color }}
                  />
                )}
                <span className="text-[11px] text-secondary truncate leading-tight">{d.label}</span>
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.color ? '' : barColorCls}`}
                  style={{
                    width: `${(d.value / max) * 100}%`,
                    ...(d.color ? { background: d.color } : {}),
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-heading w-5 text-right flex-shrink-0">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
