import { fmtInr } from "@/lib/demand";

export interface CategoryAgg {
  vol: number;
  proposed: number;
  accepted: number;
  dropped: number;
  disputed: number;
}

export type SummaryByCategory = Record<"IT" | "GST" | "Other" | "Total", CategoryAgg>;

const CATEGORY_ROWS: { key: keyof SummaryByCategory; label: string }[] = [
  { key: "IT", label: "IT" },
  { key: "GST", label: "GST" },
  { key: "Other", label: "Other" },
  { key: "Total", label: "Total" },
];

export function blankCategoryAgg(): CategoryAgg {
  return { vol: 0, proposed: 0, accepted: 0, dropped: 0, disputed: 0 };
}

export function blankSummaryByCategory(): SummaryByCategory {
  return { IT: blankCategoryAgg(), GST: blankCategoryAgg(), Other: blankCategoryAgg(), Total: blankCategoryAgg() };
}

export default function ProceedingsSummaryTable({ summaryByCategory }: { summaryByCategory: SummaryByCategory }) {
  return (
    <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-heading mb-4">Proceedings Summary</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 px-3 font-medium text-right">Vol.</th>
              <th className="py-2 px-3 font-medium text-right">Proposed</th>
              <th className="py-2 px-3 font-medium text-right">Dropped</th>
              <th className="py-2 px-3 font-medium text-right">Accepted</th>
              <th className="py-2 pl-3 font-medium text-right">Disputed</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ROWS.map(({ key, label }) => {
              const row = summaryByCategory[key];
              const isTotal = key === "Total";
              return (
                <tr
                  key={key}
                  className={`border-b border-border last:border-0 ${isTotal ? "font-semibold text-heading" : "text-secondary"}`}
                >
                  <td className="py-2 pr-3">{label}</td>
                  <td className="py-2 px-3 text-right">{row.vol}</td>
                  <td className="py-2 px-3 text-right">₹{fmtInr(row.proposed)}</td>
                  <td className="py-2 px-3 text-right">₹{fmtInr(row.dropped)}</td>
                  <td className="py-2 px-3 text-right text-success">₹{fmtInr(row.accepted)}</td>
                  <td className="py-2 pl-3 text-right text-danger">₹{fmtInr(row.disputed)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
