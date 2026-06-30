/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { LitigationReportData } from "@/app/(sp)/litigations/actions";
import { buildHierarchy, catLabel, cap, fmtDate } from "./hierarchy";
import { BRAND, hexToRgb } from "@/lib/theme";

const NAVY      = hexToRgb(BRAND.primary);
const MID_BLUE  = hexToRgb(BRAND.accent);
const LIGHT_HDR = hexToRgb(BRAND.tableHeader);
const GRAY_TXT  = hexToRgb(BRAND.secondary);
const DARK_TXT  = hexToRgb(BRAND.heading);

// Semantic colours for status/importance/outcome (matches UI tokens)
const C_SUCCESS: [number, number, number] = [22, 163, 74];
const C_WARNING: [number, number, number] = [217, 119, 6];
const C_DANGER:  [number, number, number] = [220, 38, 38];
const C_INFO:    [number, number, number] = [37, 99, 235];

function importanceColor(imp: string): [number, number, number] {
  if (imp === "critical") return C_DANGER;
  if (imp === "high")     return C_WARNING;
  if (imp === "medium")   return C_INFO;
  if (imp === "low")      return C_SUCCESS;
  return GRAY_TXT;
}

function outcomeColor(out: string): [number, number, number] {
  if (out === "favourable")   return C_SUCCESS;
  if (out === "doubtful")     return C_WARNING;
  if (out === "unfavourable") return C_DANGER;
  return GRAY_TXT;
}

function statusColor(st: string): [number, number, number] {
  if (st === "closed")      return C_SUCCESS;
  if (st === "in_progress" || st === "in-progress") return C_WARNING;
  return C_INFO;
}

// Category-specific detail fields (mirrors AppealDetailClient CATEGORY_FIELDS)
const CATEGORY_DETAIL_FIELDS: Record<string, { key: string; label: string }[]> = {
  notice_from_authority:   [{ key: "date_of_notice", label: "Notice Date" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  show_cause_notice:       [{ key: "date_of_notice", label: "SCN Date" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  personal_hearing_notice: [{ key: "hearing_date", label: "Hearing Date" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  virtual_hearing_notice:  [{ key: "hearing_date", label: "Hearing Date" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  assessment_order:        [{ key: "date_of_order", label: "Date of Order" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  penalty_order:           [{ key: "date_of_order", label: "Date of Order" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  filing_of_appeal:        [{ key: "order_date", label: "Order Date" }, { key: "due_date", label: "Due Date for Filing" }, { key: "target_date_filing", label: "Target Date for Filing" }, { key: "appeal_filed_on", label: "Appeal Filed On" }, { key: "internal_target_date", label: "Internal Target Date" }],
  cit_a_order:             [{ key: "date_of_order", label: "Date of Order" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  itat_order:              [{ key: "date_of_order", label: "Date of Order" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  high_court_order:        [{ key: "date_of_order", label: "Date of Order" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  supreme_court_order:     [{ key: "date_of_order", label: "Date of Order" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  stay_petition:           [{ key: "date", label: "Date" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  others:                  [{ key: "date", label: "Date" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  response_to_notice:      [{ key: "response_submitted_on", label: "Response Submitted On" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
  adjournment_request:     [{ key: "adjourned_to", label: "Adjourned To" }, { key: "internal_target_date", label: "Internal Target Date" }],
  personal_follow_up:      [{ key: "follow_up_with", label: "Follow Up With" }, { key: "follow_up_by", label: "Follow Up By" }, { key: "internal_target_date", label: "Internal Target Date" }],
  others_sub:              [{ key: "date", label: "Date" }, { key: "due_date", label: "Due Date" }, { key: "internal_target_date", label: "Internal Target Date" }],
};

function fmtDetailValue(key: string, val: string): string {
  if (!val) return "";
  // Detect ISO date strings (datetime fields)
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return fmtDate(val);
  return val;
}

function footer(doc: jsPDF, pageW: number, pageH: number, generatedAt: string, spName: string) {
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `${spName} — Litigation Report — ${fmtDate(generatedAt)}`,
    14,
    pageH - 6,
  );
  const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
  doc.text(`Page ${pg}`, pageW - 14, pageH - 6, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

export function generatePDF(data: LitigationReportData): Blob {
  const doc  = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const open       = data.appeals.filter((a) => a.status === "open").length;
  const inProgress = data.appeals.filter((a) => a.status === "in-progress").length;
  const closed     = data.appeals.filter((a) => a.status === "closed").length;

  const common = {
    margin: { left: 14, right: 14 },
    didDrawPage: () => footer(doc, pageW, pageH, data.generatedAt, data.spName),
  };

  // ── Cover stats ───────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(`${data.spName} — Litigation Report`, 14, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_TXT);
  doc.text(`Generated: ${fmtDate(data.generatedAt)}`, 14, 22);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    ...common,
    startY: 27,
    head: [["Total Litigations", "Open", "In-Progress", "Closed"]],
    body:  [[data.appeals.length, open, inProgress, closed]],
    theme: "grid",
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 9, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 11, halign: "center", fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 40 }, 2: { cellWidth: 40 }, 3: { cellWidth: 40 } },
    tableWidth: 170,
  });

  let y = (doc as any).lastAutoTable.finalY + 10;

  // ── Hierarchical sections ─────────────────────────────────────────
  for (const litNode of buildHierarchy(data)) {
    const { appeal } = litNode;

    // Check if we're too close to the bottom — add a new page
    if (y > pageH - 30) {
      doc.addPage();
      y = 14;
    }

    // Litigation header band
    autoTable(doc, {
      ...common,
      startY: y,
      head: [[
        `${appeal.client_name}   —   ${appeal.act_name}`,
        `FY: ${appeal.financial_year || "—"}  /  AY: ${appeal.assessment_year || "—"}`,
        cap(appeal.status),
      ]],
      body: [],
      theme: "plain",
      headStyles: {
        fillColor: NAVY, textColor: 255, fontSize: 9, fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 6, right: 6 },
      },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 60 }, 2: { cellWidth: 28 } },
    });
    y = (doc as any).lastAutoTable.finalY;

    for (const procNode of litNode.proceedings) {
      const p = procNode.proceeding;
      const procHeader = [
        p.proceeding_type || "Proceeding",
        [cap(p.authority_type), p.authority_name].filter(Boolean).join(" — "),
        [p.jurisdiction, p.jurisdiction_city].filter(Boolean).join(", "),
        cap(p.importance),
        cap(p.status),
      ].filter(Boolean).join("   |   ");

      // Proceeding sub-header
      autoTable(doc, {
        ...common,
        startY: y,
        head: [[procHeader]],
        body: [],
        theme: "plain",
        headStyles: {
          fillColor: MID_BLUE, textColor: 255, fontSize: 8, fontStyle: "bold",
          cellPadding: { top: 2, bottom: 2, left: 14, right: 6 },
        },
      });
      y = (doc as any).lastAutoTable.finalY;

      // Proceeding documents
      if (procNode.documents.length > 0) {
        const docRows = procNode.documents.map((d) => [
          `📎  ${d.file_name}`, d.description,
        ]);
        autoTable(doc, {
          ...common,
          startY: y,
          body: docRows,
          theme: "plain",
          bodyStyles: { fontSize: 7, textColor: [80, 80, 80], cellPadding: { top: 1, bottom: 1, left: 22, right: 6 } },
          columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: "auto" } },
        });
        y = (doc as any).lastAutoTable.finalY;
      }

      // Events table
      if (procNode.mainEvents.length > 0) {
        const eventRows: string[][] = [];

        for (const evtNode of procNode.mainEvents) {
          const e = evtNode.event;
          eventRows.push([
            "Main Event",
            catLabel(e.category),
            fmtDate(e.event_date),
            e.event_notice_number || "",
            cap(e.status),
            e.description || "",
          ]);

          for (const doc of evtNode.documents) {
            eventRows.push([
              "Attachment",
              `📎  ${doc.file_name}`,
              "", "", "",
              doc.description || "",
            ]);
          }

          for (const subNode of evtNode.subEvents) {
            const s = subNode.event;
            eventRows.push([
              "↳ Sub Event",
              catLabel(s.category),
              fmtDate(s.event_date),
              s.event_notice_number || "",
              cap(s.status),
              s.description || "",
            ]);

            for (const doc of subNode.documents) {
              eventRows.push([
                "  Attachment",
                `📎  ${doc.file_name}`,
                "", "", "",
                doc.description || "",
              ]);
            }
          }
        }

        autoTable(doc, {
          ...common,
          startY: y,
          head: [["Type", "Category / File", "Date", "Notice #", "Status", "Description"]],
          body: eventRows,
          theme: "striped",
          headStyles: { fillColor: LIGHT_HDR, textColor: DARK_TXT, fontSize: 7, fontStyle: "bold" },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [247, 249, 252] },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 52 },
            2: { cellWidth: 20 },
            3: { cellWidth: 24 },
            4: { cellWidth: 18 },
            5: { cellWidth: "auto" },
          },
          margin: { left: 20, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 3;
      } else {
        y += 1;
      }
    }

    y += 6;
  }

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

// ── Shared helper: render proceedings + events for single-report PDFs ─────────

function renderProceedingsSection(
  doc: jsPDF,
  data: LitigationReportData,
  proceedingNodes: ReturnType<typeof buildHierarchy>[0]["proceedings"],
  startY: number,
  pageW: number,
  pageH: number,
  footerFn: () => void,
): number {
  const common = { margin: { left: 14, right: 14 }, didDrawPage: footerFn };
  let y = startY;

  for (let idx = 0; idx < proceedingNodes.length; idx++) {
    const procNode = proceedingNodes[idx];
    const p = procNode.proceeding;

    if (y > pageH - 50) { doc.addPage(); y = 14; }

    const impColor = importanceColor(p.importance);
    const outColor = outcomeColor(p.possible_outcome);
    const stColor  = statusColor(p.status);

    // Proceeding header band
    autoTable(doc, {
      ...common,
      startY: y,
      head: [[`Proceeding #${idx + 1}  —  ${p.proceeding_type || "—"}`, cap(p.status)]],
      body: [],
      theme: "plain",
      headStyles: {
        fillColor: [54, 54, 54],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
        cellPadding: { top: 3, bottom: 3, left: 6, right: 6 },
      },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 28, halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY;

    // Proceeding detail key-value table
    const detailRows: string[][] = [
      ["Authority Type", cap(p.authority_type) || "—",  "Authority Name", p.authority_name || "—",  "Jurisdiction", [p.jurisdiction_city, p.jurisdiction].filter(Boolean).join(", ") || "—"],
      ["Mode",          cap(p.mode) || "—",             "Initiated On",   fmtDate(p.initiated_on) || "—",  "To Be Completed By", fmtDate(p.to_be_completed_by) || "—"],
      ["Assigned To",   p.assigned_names || "—",        "Possible Outcome", cap(p.possible_outcome) || "—",  "Importance", cap(p.importance) || "—"],
    ];

    autoTable(doc, {
      ...common,
      startY: y,
      body: detailRows,
      theme: "plain",
      bodyStyles: { fontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 6, right: 4 } },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold", textColor: GRAY_TXT },
        1: { cellWidth: 50 },
        2: { cellWidth: 32, fontStyle: "bold", textColor: GRAY_TXT },
        3: { cellWidth: 50 },
        4: { cellWidth: 30, fontStyle: "bold", textColor: GRAY_TXT },
        5: { cellWidth: "auto" },
      },
      didParseCell: (hookData: any) => {
        if (hookData.column.index === 1 && hookData.row.index === 2 && p.possible_outcome) {
          hookData.cell.styles.textColor = outColor;
        }
        if (hookData.column.index === 5 && hookData.row.index === 2 && p.importance) {
          hookData.cell.styles.textColor = impColor;
        }
        if (hookData.column.index === 1 && hookData.row.index === 0) {
          hookData.cell.styles.textColor = stColor;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY;

    // Proceeding documents
    if (procNode.documents.length > 0) {
      autoTable(doc, {
        ...common,
        startY: y,
        head: [["Attachments"]],
        body: procNode.documents.map((d) => [`  \u{1F4CE}  ${d.file_name}${d.description ? "  —  " + d.description : ""}`]),
        theme: "plain",
        headStyles: { fontSize: 7, fontStyle: "bold", textColor: GRAY_TXT, fillColor: [247, 247, 247], cellPadding: { top: 2, bottom: 1, left: 6, right: 6 } },
        bodyStyles: { fontSize: 7, textColor: [80, 80, 80], cellPadding: { top: 1, bottom: 1, left: 14, right: 6 } },
      });
      y = (doc as any).lastAutoTable.finalY;
    }

    // Events table
    if (procNode.mainEvents.length > 0) {
      type EventRow = { _type: string; cells: string[]; status?: string };
      const eventRows: EventRow[] = [];

      for (const evtNode of procNode.mainEvents) {
        const e = evtNode.event;
        const effectiveCat = e.category;
        const detailFields = CATEGORY_DETAIL_FIELDS[effectiveCat] ?? [];

        eventRows.push({
          _type: "main",
          cells: [catLabel(e.category), fmtDate(e.event_date), e.event_notice_number || "—", cap(e.status), e.description || ""],
          status: e.status,
        });

        // Detail rows from JSONB
        for (const field of detailFields) {
          const val = e.details?.[field.key];
          if (val) {
            eventRows.push({ _type: "detail", cells: ["", field.label, fmtDetailValue(field.key, val), "", "", ""] });
          }
        }

        // Attachments for main event
        for (const d of evtNode.documents) {
          eventRows.push({ _type: "doc", cells: ["", `\u{1F4CE} ${d.file_name}`, d.description || "", "", "", ""] });
        }

        // Sub events
        for (const subNode of evtNode.subEvents) {
          const s = subNode.event;
          const subEffCat = s.event_type === "sub" && s.category === "others" ? "others_sub" : s.category;
          const subFields = CATEGORY_DETAIL_FIELDS[subEffCat] ?? [];

          eventRows.push({ _type: "sub", cells: [catLabel(s.category), fmtDate(s.event_date), s.event_notice_number || "—", cap(s.status), s.description || ""], status: s.status });

          for (const field of subFields) {
            const val = s.details?.[field.key];
            if (val) {
              eventRows.push({ _type: "detail_sub", cells: ["", field.label, fmtDetailValue(field.key, val), "", "", ""] });
            }
          }

          for (const d of subNode.documents) {
            eventRows.push({ _type: "doc_sub", cells: ["", `\u{1F4CE} ${d.file_name}`, d.description || "", "", "", ""] });
          }
        }
      }

      const HEAD_COL = ["Category", "Date", "Notice #", "Status", "Description"];
      const COL_W: Record<number, object> = {
        0: { cellWidth: 52 },
        1: { cellWidth: 22 },
        2: { cellWidth: 26 },
        3: { cellWidth: 22 },
        4: { cellWidth: "auto" },
      };

      autoTable(doc, {
        ...common,
        startY: y,
        head: [HEAD_COL],
        body: eventRows.map((r) => r.cells),
        theme: "striped",
        headStyles: { fillColor: LIGHT_HDR, textColor: DARK_TXT, fontSize: 7, fontStyle: "bold" },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [249, 249, 249] },
        columnStyles: COL_W,
        margin: { left: 20, right: 14 },
        didParseCell: (hookData: any) => {
          const row = eventRows[hookData.row.index];
          if (!row) return;
          if (row._type === "sub" || row._type === "detail_sub" || row._type === "doc_sub") {
            hookData.cell.styles.fillColor = [244, 244, 244];
          }
          if ((row._type === "sub" || row._type === "main") && hookData.column.index === 0) {
            hookData.cell.styles.fontStyle = "bold";
            if (row._type === "sub") hookData.cell.styles.textColor = MID_BLUE;
          }
          if ((row._type === "main" || row._type === "sub") && hookData.column.index === 3) {
            hookData.cell.styles.textColor = statusColor(row.status ?? "");
          }
          if (row._type === "detail" || row._type === "detail_sub") {
            hookData.cell.styles.textColor = [120, 120, 120];
            if (hookData.column.index === 1) hookData.cell.styles.fontStyle = "italic";
          }
          if (row._type === "doc" || row._type === "doc_sub") {
            hookData.cell.styles.textColor = [100, 100, 100];
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    } else {
      y += 2;
    }
  }

  return y;
}

// ── Litigation-level single PDF ────────────────────────────────────────────────

export function generateLitigationPDF(data: LitigationReportData): Blob {
  const doc  = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const nodes = buildHierarchy(data);
  if (nodes.length === 0) return new Blob([], { type: "application/pdf" });

  const litNode = nodes[0];
  const appeal  = litNode.appeal;

  const footerFn = () => {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${data.spName}  —  Litigation Report  —  ${fmtDate(data.generatedAt)}`, 14, pageH - 6);
    const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.text(`Page ${pg}`, pageW - 14, pageH - 6, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  const common = { margin: { left: 14, right: 14 }, didDrawPage: footerFn };

  // ── Cover header ─────────────────────────────────────────────────
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(`${appeal.client_name}  —  Litigation Report`, 14, 16);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_TXT);
  doc.text(`${data.spName}   ·   Generated: ${fmtDate(data.generatedAt)}`, 14, 22);
  doc.setTextColor(0, 0, 0);

  // ── Litigation header detail table ────────────────────────────────
  autoTable(doc, {
    ...common,
    startY: 27,
    head: [["Litigation Details"]],
    body: [
      ["Client",          appeal.client_name || "—",        "Act / Regulation",  appeal.act_name || "—"],
      ["Financial Year",  appeal.financial_year || "—",     "Assessment Year",    appeal.assessment_year || "—"],
      ["Status",          cap(appeal.status) || "—",        "Created",            fmtDate(appeal.created_at) || "—"],
    ],
    theme: "plain",
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8.5, fontStyle: "bold", cellPadding: { top: 3, bottom: 3, left: 6, right: 6 } },
    bodyStyles: { fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 6, right: 4 } },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold", textColor: GRAY_TXT },
      1: { cellWidth: 80 },
      2: { cellWidth: 38, fontStyle: "bold", textColor: GRAY_TXT },
      3: { cellWidth: "auto" },
    },
    didParseCell: (hookData: any) => {
      if (hookData.column.index === 1 && hookData.row.index === 2) {
        hookData.cell.styles.textColor = statusColor(appeal.status);
      }
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 6;

  // ── Proceedings ───────────────────────────────────────────────────
  y = renderProceedingsSection(doc, data, litNode.proceedings, y, pageW, pageH, footerFn);

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

// ── Proceeding-level single PDF ───────────────────────────────────────────────

export function generateProceedingPDF(data: LitigationReportData): Blob {
  const doc  = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const nodes = buildHierarchy(data);
  if (nodes.length === 0) return new Blob([], { type: "application/pdf" });

  const litNode = nodes[0];
  const appeal  = litNode.appeal;

  const footerFn = () => {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${data.spName}  —  Proceeding Report  —  ${fmtDate(data.generatedAt)}`, 14, pageH - 6);
    const pg = (doc as any).internal.getCurrentPageInfo().pageNumber;
    doc.text(`Page ${pg}`, pageW - 14, pageH - 6, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  const common = { margin: { left: 14, right: 14 }, didDrawPage: footerFn };

  // ── Litigation header (compact) ───────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(`${appeal.client_name}  —  Proceeding Report`, 14, 16);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY_TXT);
  doc.text(`${data.spName}   ·   Generated: ${fmtDate(data.generatedAt)}`, 14, 22);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    ...common,
    startY: 27,
    head: [["Litigation"]],
    body: [
      ["Client",         appeal.client_name || "—",      "Act / Regulation", appeal.act_name || "—"],
      ["Financial Year", appeal.financial_year || "—",   "Assessment Year",   appeal.assessment_year || "—"],
      ["Status",         cap(appeal.status) || "—",      "Created",           fmtDate(appeal.created_at) || "—"],
    ],
    theme: "plain",
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 8, fontStyle: "bold", cellPadding: { top: 2.5, bottom: 2.5, left: 6, right: 6 } },
    bodyStyles: { fontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 6, right: 4 } },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold", textColor: GRAY_TXT },
      1: { cellWidth: 80 },
      2: { cellWidth: 38, fontStyle: "bold", textColor: GRAY_TXT },
      3: { cellWidth: "auto" },
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 6;

  // ── Single proceeding ─────────────────────────────────────────────
  y = renderProceedingsSection(doc, data, litNode.proceedings, y, pageW, pageH, footerFn);

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}
