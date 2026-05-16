import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  WidthType,
  ShadingType,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { LitigationReportData } from "@/app/(sp)/litigations/actions";
import { buildHierarchy, catLabel, cap, fmtDate } from "./hierarchy";

const NAVY_FILL  = "1E3A5F";
const PROC_FILL  = "4A6FA5";
const HDR_FILL   = "D1D9E6";
const STRIPE_FILL = "F7F9FC";

const NO_BORDER = {
  top:    { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left:   { style: BorderStyle.NONE, size: 0, color: "auto" },
  right:  { style: BorderStyle.NONE, size: 0, color: "auto" },
};

function hCell(text: string, fill = HDR_FILL, color = "1A1A2E"): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: "auto", fill },
    borders: NO_BORDER,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color, size: 17 })],
    })],
  });
}

function dCell(text: string, shade = false, italic = false): TableCell {
  return new TableCell({
    shading: shade ? { type: ShadingType.CLEAR, color: "auto", fill: STRIPE_FILL } : undefined,
    borders: NO_BORDER,
    children: [new Paragraph({
      children: [new TextRun({ text: text ?? "", size: 16, italics: italic })],
    })],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: "", spacing: { after: 80 } });
}

export async function generateDocx(data: LitigationReportData): Promise<Blob> {
  const open       = data.appeals.filter((a) => a.status === "open").length;
  const inProgress = data.appeals.filter((a) => a.status === "in-progress").length;
  const closed     = data.appeals.filter((a) => a.status === "closed").length;

  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: `${data.spName} — Litigation Report`, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${fmtDate(data.generatedAt)}`, size: 18, color: "6B7280" })],
      spacing: { after: 200 },
    }),

    // ── Summary stats table ──────────────────────────────────────
    new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }),
    new Table({
      width: { size: 40, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [hCell("Metric"), hCell("Count")] }),
        new TableRow({ children: [dCell("Total Litigations"), dCell(String(data.appeals.length))] }),
        new TableRow({ children: [dCell("Open", true), dCell(String(open), true)] }),
        new TableRow({ children: [dCell("In-Progress"), dCell(String(inProgress))] }),
        new TableRow({ children: [dCell("Closed", true), dCell(String(closed), true)] }),
      ],
    }),
    spacer(),
    spacer(),
  ];

  // ── Hierarchical sections ─────────────────────────────────────────
  for (const litNode of buildHierarchy(data)) {
    const { appeal } = litNode;

    // Litigation heading
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${appeal.client_name}  —  ${appeal.act_name}`,
            bold: true,
            size: 26,
            color: NAVY_FILL,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 60 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: [
              appeal.financial_year ? `FY: ${appeal.financial_year}` : "",
              appeal.assessment_year ? `AY: ${appeal.assessment_year}` : "",
              `Status: ${cap(appeal.status)}`,
            ].filter(Boolean).join("   |   "),
            size: 18,
            color: "6B7280",
          }),
        ],
        spacing: { after: 120 },
      }),
    );

    for (const procNode of litNode.proceedings) {
      const p = procNode.proceeding;
      const procDetails = [
        [cap(p.authority_type), p.authority_name].filter(Boolean).join(" — "),
        [p.jurisdiction, p.jurisdiction_city].filter(Boolean).join(", "),
        p.importance ? `Importance: ${cap(p.importance)}` : "",
        p.assigned_names ? `Assigned: ${p.assigned_names}` : "",
        p.to_be_completed_by ? `Due: ${fmtDate(p.to_be_completed_by)}` : "",
      ].filter(Boolean).join("   |   ");

      // Proceeding heading
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Proceeding: ${p.proceeding_type || "—"}`,
              bold: true,
              size: 22,
              color: PROC_FILL,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: procDetails, size: 17, color: "6B7280" })],
          spacing: { after: 80 },
        }),
      );

      // Proceeding documents
      if (procNode.documents.length > 0) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Proceeding Documents:", bold: true, size: 17 })],
          }),
          ...procNode.documents.map(
            (doc) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `📎  ${doc.file_name}`, size: 17 }),
                  doc.description
                    ? new TextRun({ text: `  —  ${doc.description}`, size: 16, color: "6B7280" })
                    : new TextRun({ text: "" }),
                ],
                indent: { left: 360 },
                spacing: { after: 40 },
              }),
          ),
        );
      }

      // Events table
      if (procNode.mainEvents.length > 0) {
        const eventRowHeaders = new TableRow({
          children: [
            hCell("Type"),
            hCell("Category / File"),
            hCell("Date"),
            hCell("Notice #"),
            hCell("Status"),
            hCell("Description"),
          ],
        });

        const eventDataRows: TableRow[] = [];
        let rowIndex = 0;

        for (const evtNode of procNode.mainEvents) {
          const e = evtNode.event;
          const shade = rowIndex % 2 === 1;
          eventDataRows.push(
            new TableRow({
              children: [
                dCell("Main Event", shade),
                dCell(catLabel(e.category), shade),
                dCell(fmtDate(e.event_date), shade),
                dCell(e.event_notice_number, shade),
                dCell(cap(e.status), shade),
                dCell(e.description, shade),
              ],
            }),
          );
          rowIndex++;

          // Event documents
          for (const doc of evtNode.documents) {
            const s2 = rowIndex % 2 === 1;
            eventDataRows.push(
              new TableRow({
                children: [
                  dCell("Attachment", s2, true),
                  dCell(`📎  ${doc.file_name}`, s2, true),
                  dCell("", s2),
                  dCell("", s2),
                  dCell("", s2),
                  dCell(doc.description, s2, true),
                ],
              }),
            );
            rowIndex++;
          }

          // Sub events
          for (const subNode of evtNode.subEvents) {
            const s = subNode.event;
            const s3 = rowIndex % 2 === 1;
            eventDataRows.push(
              new TableRow({
                children: [
                  dCell("↳ Sub Event", s3),
                  dCell(catLabel(s.category), s3),
                  dCell(fmtDate(s.event_date), s3),
                  dCell(s.event_notice_number, s3),
                  dCell(cap(s.status), s3),
                  dCell(s.description, s3),
                ],
              }),
            );
            rowIndex++;

            for (const doc of subNode.documents) {
              const s4 = rowIndex % 2 === 1;
              eventDataRows.push(
                new TableRow({
                  children: [
                    dCell("  Attachment", s4, true),
                    dCell(`📎  ${doc.file_name}`, s4, true),
                    dCell("", s4),
                    dCell("", s4),
                    dCell("", s4),
                    dCell(doc.description, s4, true),
                  ],
                }),
              );
              rowIndex++;
            }
          }
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [eventRowHeaders, ...eventDataRows],
          }),
          spacer(),
        );
      }
    }

    children.push(spacer());
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
