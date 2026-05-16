import type {
  LitigationReportData,
  ReportAppeal,
  ReportProceeding,
  ReportEvent,
  ReportDocument,
} from "@/app/(sp)/litigations/actions";

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  notice_from_authority:   "Notice from Authority",
  show_cause_notice:       "Show Cause Notice (SCN)",
  personal_hearing_notice: "Personal Hearing Notice",
  virtual_hearing_notice:  "Virtual Hearing Notice",
  assessment_order:        "Assessment Order",
  penalty_order:           "Penalty Order",
  filing_of_appeal:        "Filing of Appeal",
  others:                  "Others",
  response_to_notice:      "Response to Notice",
  adjournment_request:     "Adjournment Request",
  personal_follow_up:      "Personal Follow-up",
  others_sub:              "Others",
};

export function catLabel(category: string): string {
  return EVENT_CATEGORY_LABELS[category] ?? category;
}

export function cap(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export interface SubEventNode {
  event: ReportEvent;
  documents: ReportDocument[];
}

export interface EventNode {
  event: ReportEvent;
  documents: ReportDocument[];
  subEvents: SubEventNode[];
}

export interface ProceedingNode {
  proceeding: ReportProceeding;
  documents: ReportDocument[];
  mainEvents: EventNode[];
}

export interface LitigationNode {
  appeal: ReportAppeal;
  proceedings: ProceedingNode[];
}

export function buildHierarchy(data: LitigationReportData): LitigationNode[] {
  const procDocMap = new Map<string, ReportDocument[]>();
  data.proceedingDocuments.forEach((d) => {
    const arr = procDocMap.get(d.parent_id) ?? [];
    arr.push(d);
    procDocMap.set(d.parent_id, arr);
  });

  const eventDocMap = new Map<string, ReportDocument[]>();
  data.eventDocuments.forEach((d) => {
    const arr = eventDocMap.get(d.parent_id) ?? [];
    arr.push(d);
    eventDocMap.set(d.parent_id, arr);
  });

  const procsByAppeal = new Map<string, ReportProceeding[]>();
  data.proceedings.forEach((p) => {
    const arr = procsByAppeal.get(p.appeal_id) ?? [];
    arr.push(p);
    procsByAppeal.set(p.appeal_id, arr);
  });

  const eventsByProceeding = new Map<string, ReportEvent[]>();
  data.events.forEach((e) => {
    const arr = eventsByProceeding.get(e.proceeding_id) ?? [];
    arr.push(e);
    eventsByProceeding.set(e.proceeding_id, arr);
  });

  return data.appeals.map((appeal) => {
    const proceedings = (procsByAppeal.get(appeal.id) ?? []).map((proc) => {
      const allEvents = eventsByProceeding.get(proc.id) ?? [];
      const mainEvents = allEvents.filter((e) => e.event_type === "main");
      const subsByParent = new Map<string, ReportEvent[]>();
      allEvents
        .filter((e) => e.event_type === "sub" && e.parent_event_id)
        .forEach((e) => {
          const arr = subsByParent.get(e.parent_event_id!) ?? [];
          arr.push(e);
          subsByParent.set(e.parent_event_id!, arr);
        });

      const eventNodes: EventNode[] = mainEvents.map((mainEvt) => ({
        event: mainEvt,
        documents: eventDocMap.get(mainEvt.id) ?? [],
        subEvents: (subsByParent.get(mainEvt.id) ?? []).map((sub) => ({
          event: sub,
          documents: eventDocMap.get(sub.id) ?? [],
        })),
      }));

      return {
        proceeding: proc,
        documents: procDocMap.get(proc.id) ?? [],
        mainEvents: eventNodes,
      };
    });

    return { appeal, proceedings };
  });
}
