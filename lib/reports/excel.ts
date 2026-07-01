import * as XLSX from "xlsx";
import type { LitigationReportData } from "@/app/(sp)/litigations/actions";
import { buildHierarchy, catLabel, cap, fmtDate } from "./hierarchy";

interface RowSpec {
  data: (string | number)[];
  outlineLevel: number; // 0 = litigation, 1 = proceeding/proc-doc, 2 = event/event-doc, 3 = sub-event/sub-doc
}

export function generateExcel(data: LitigationReportData): Blob {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──────────────────────────────────────────────
  const open   = data.appeals.filter((a) => a.status === "open").length;
  const closed = data.appeals.filter((a) => a.status === "closed").length;

  const summaryRows = [
    [`${data.spName} — Litigation Report`],
    ["Generated on", fmtDate(data.generatedAt)],
    [],
    ["Total Litigations", data.appeals.length],
    ["Open",   open],
    ["Closed", closed],
    [],
    ["#", "Client", "Financial Year", "Assessment Year", "Act / Regulation", "Status", "Created On"],
    ...data.appeals.map((a, i) => [
      i + 1,
      a.client_name,
      a.financial_year,
      a.assessment_year,
      a.act_name,
      cap(a.status),
      fmtDate(a.created_at),
    ]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  ws1["!cols"] = [
    { wch: 4 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 36 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");

  // ── Sheet 2: Hierarchy ────────────────────────────────────────────
  // Columns: Type | Name / Category | Date | Status | Details | Additional Info | Notice # / Assigned
  const HEADER_ROW = [
    "Type", "Name / Category", "Date", "Status", "Details", "Additional Info", "Notice # / Assigned",
  ];

  const specs: RowSpec[] = [{ data: HEADER_ROW, outlineLevel: 0 }];

  for (const litNode of buildHierarchy(data)) {
    const { appeal } = litNode;

    // ── LITIGATION row ───────────────────────────────────────────
    specs.push({
      outlineLevel: 0,
      data: [
        "LITIGATION",
        appeal.client_name,
        appeal.act_name,
        cap(appeal.status),
        [
          appeal.financial_year ? `FY: ${appeal.financial_year}` : "",
          appeal.assessment_year ? `AY: ${appeal.assessment_year}` : "",
        ].filter(Boolean).join("  |  "),
        "",
        "",
      ],
    });

    for (const procNode of litNode.proceedings) {
      const p = procNode.proceeding;
      const authorityInfo = [cap(p.authority_type), p.authority_name].filter(Boolean).join(" — ");
      const locationInfo  = [p.jurisdiction, p.jurisdiction_city].filter(Boolean).join(", ");
      const assignedInfo  = [
        p.importance ? `Importance: ${cap(p.importance)}` : "",
        p.assigned_names ? `Assigned: ${p.assigned_names}` : "",
      ].filter(Boolean).join("  |  ");

      // ── PROCEEDING row ─────────────────────────────────────────
      specs.push({
        outlineLevel: 1,
        data: [
          "PROCEEDING",
          p.proceeding_type || "—",
          fmtDate(p.initiated_on),
          cap(p.status),
          authorityInfo,
          locationInfo,
          assignedInfo,
        ],
      });

      // Proceeding documents
      for (const doc of procNode.documents) {
        specs.push({
          outlineLevel: 1,
          data: ["PROC DOC", `📎  ${doc.file_name}`, "", "", doc.description, "", ""],
        });
      }

      // ── MAIN EVENTs ────────────────────────────────────────────
      for (const evtNode of procNode.mainEvents) {
        const e = evtNode.event;
        specs.push({
          outlineLevel: 2,
          data: [
            "MAIN EVENT",
            catLabel(e.category),
            fmtDate(e.event_date),
            cap(e.status),
            e.description,
            "",
            e.event_notice_number,
          ],
        });

        // Event documents
        for (const doc of evtNode.documents) {
          specs.push({
            outlineLevel: 2,
            data: ["EVENT DOC", `📎  ${doc.file_name}`, "", "", doc.description, "", ""],
          });
        }

        // ── SUB EVENTs ───────────────────────────────────────────
        for (const subNode of evtNode.subEvents) {
          const s = subNode.event;
          specs.push({
            outlineLevel: 3,
            data: [
              "SUB EVENT",
              `↳ ${catLabel(s.category)}`,
              fmtDate(s.event_date),
              cap(s.status),
              s.description,
              "",
              s.event_notice_number,
            ],
          });

          for (const doc of subNode.documents) {
            specs.push({
              outlineLevel: 3,
              data: ["SUB DOC", `📎  ${doc.file_name}`, "", "", doc.description, "", ""],
            });
          }
        }
      }
    }
  }

  const ws2 = XLSX.utils.aoa_to_sheet(specs.map((s) => s.data));
  ws2["!cols"] = [
    { wch: 12 }, { wch: 36 }, { wch: 14 }, { wch: 14 },
    { wch: 40 }, { wch: 28 }, { wch: 30 },
  ];
  // Row outline grouping — lets users click the 1/2/3/4 outline buttons in Excel
  ws2["!rows"] = specs.map((s, i) =>
    i === 0 || s.outlineLevel === 0 ? {} : { level: s.outlineLevel },
  );
  XLSX.utils.book_append_sheet(wb, ws2, "Hierarchy");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
