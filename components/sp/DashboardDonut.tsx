import { BRAND } from '@/lib/theme'

interface DonutDatum {
  label: string
  value: number
  color: string
}

interface Props {
  title: string
  data: DonutDatum[]
  size?: number
  strokeWidth?: number
}

export function DashboardDonut({ title, data, size = 64, strokeWidth = 9 }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offsetAcc = 0

  return (
    <div className="bg-white border border-border rounded-xl p-2.5 h-full flex flex-col">
      <div className="flex items-baseline justify-between gap-2 mb-1.5 flex-shrink-0">
        <h3 className="text-xs font-semibold text-heading truncate" title={title}>{title}</h3>
        <span className="text-[10px] text-muted flex-shrink-0">Total: {total}</span>
      </div>
      {total === 0 ? (
        <p className="flex-1 flex items-center justify-center text-xs text-muted">No data yet.</p>
      ) : (
        <div className="flex-1 flex items-center gap-3">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="flex-shrink-0 -rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={BRAND.border}
              strokeWidth={strokeWidth}
            />
            {data
              .filter((d) => d.value > 0)
              .map((d) => {
                const dash = (d.value / total) * circumference
                const el = (
                  <circle
                    key={d.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offsetAcc}
                  />
                )
                offsetAcc += dash
                return el
              })}
          </svg>
          <div className="flex-1 min-w-0 space-y-1">
            {data.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-2 text-[11px] leading-tight">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="text-secondary truncate" title={d.label}>{d.label}</span>
                </span>
                <span className="text-heading font-medium whitespace-nowrap">
                  {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
