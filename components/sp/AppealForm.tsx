"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAppeal, AppealInput, ProceedingInput } from "@/app/(sp)/litigations/actions";

/** Derives AY name from FY name: "2020-21" → "2021-22" */
function deriveAYName(fyName: string): string {
  const match = fyName.match(/^(\d{4})-(\d{2})$/);
  if (!match) return "";
  const ayStart = parseInt(match[1]) + 1;
  const ayEnd = (parseInt(match[2]) + 1).toString().padStart(2, "0");
  return `${ayStart}-${ayEnd}`;
}

/** AY is disabled for FY 2026-27 and beyond (start year ≥ 2026) */
function isAYDisabled(fyName: string): boolean {
  const match = fyName.match(/^(\d{4})/);
  return !!match && parseInt(match[1]) >= 2026;
}

type MasterItem = { id: string; name: string; type: string; parent_id: string | null };

interface Props {
  clients: { id: string; name: string }[];
  teamMembers: { id: string; first_name: string; last_name: string }[];
  mastersByType: Record<string, MasterItem[]>;
  clientUsersByOrg: Record<string, { id: string; first_name: string; last_name: string }[]>;
}

const inp = "w-full px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#6B7280] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AppealForm({ clients, teamMembers, mastersByType, clientUsersByOrg }: Props) {
  const router = useRouter();

  // All master-linked fields store UUIDs (master_records.id)
  const [clientOrgId, setClientOrgId] = useState("");
  const [financialYearId, setFinancialYearId] = useState("");
  const [assessmentYearId, setAssessmentYearId] = useState("");
  const [actRegulationId, setActRegulationId] = useState("");
  const [appealStatus, setAppealStatus] = useState("open");

  const [proceedingTypeId, setProceedingTypeId] = useState("");
  const [authorityType, setAuthorityType] = useState("");
  const [authorityName, setAuthorityName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [jurisdictionCity, setJurisdictionCity] = useState("");
  const [importance, setImportance] = useState("");
  const [mode, setMode] = useState("");
  const [initiatedOn, setInitiatedOn] = useState("");
  const [toBeCompletedBy, setToBeCompletedBy] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [clientStaff, setClientStaff] = useState("");
  const [possibleOutcome, setPossibleOutcome] = useState("");
  const [proceedingStatus, setProceedingStatus] = useState("open");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive selected act name
  const selectedAct = (mastersByType["act_regulation"] ?? []).find(m => m.id === actRegulationId);
  const isITAct = selectedAct?.name === "The Income-tax Act, 1961";

  // AY is only available for the IT Act; within IT Act it's also disabled for FY 2026-27+
  const selectedFY = (mastersByType["financial_year"] ?? []).find(m => m.id === financialYearId);
  const fyName = selectedFY?.name ?? "";
  const ayDisabled = !isITAct || (fyName ? isAYDisabled(fyName) : false);

  // Proceedings filtered to children of the selected act
  const availableProceedings = actRegulationId
    ? (mastersByType["proceeding_type"] ?? []).filter(m => m.parent_id === actRegulationId)
    : [];

  function handleActChange(actId: string) {
    setActRegulationId(actId);
    setProceedingTypeId("");
    // If switching away from IT Act, clear AY
    const act = (mastersByType["act_regulation"] ?? []).find(m => m.id === actId);
    if (act?.name !== "The Income-tax Act, 1961") {
      setAssessmentYearId("");
    }
  }

  function handleFYChange(fyId: string) {
    setFinancialYearId(fyId);
    if (!fyId || !isITAct) { setAssessmentYearId(""); return; }
    const fy = (mastersByType["financial_year"] ?? []).find(m => m.id === fyId);
    if (!fy || isAYDisabled(fy.name)) { setAssessmentYearId(""); return; }
    const derivedName = deriveAYName(fy.name);
    const ayItem = (mastersByType["assessment_year"] ?? []).find(m => m.name === derivedName);
    setAssessmentYearId(ayItem?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientOrgId) { setError("Client is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const appeal: AppealInput = {
        client_org_id: clientOrgId,
        financial_year_id: financialYearId || undefined,
        assessment_year_id: assessmentYearId || undefined,
        act_regulation_id: actRegulationId || undefined,
        status: appealStatus,
      };
      const proc: ProceedingInput = {
        proceeding_type_id: proceedingTypeId || undefined,
        authority_type: authorityType,
        authority_name: authorityName,
        jurisdiction,
        jurisdiction_city: jurisdictionCity,
        importance,
        mode,
        initiated_on: initiatedOn,
        to_be_completed_by: toBeCompletedBy,
        assigned_to: assignedTo,
        client_staff_id: clientStaff,
        possible_outcome: possibleOutcome,
        status: proceedingStatus,
      };
      const id = await createAppeal(appeal, proc);
      router.push(`/litigations/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create litigation.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1 */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] pb-3 border-b border-[#E5E7EB] mb-5">Litigation Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Client Organisation" required>
              <select value={clientOrgId} onChange={(e) => setClientOrgId(e.target.value)} className={inp}>
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Act / Regulation">
              <select value={actRegulationId} onChange={(e) => handleActChange(e.target.value)} className={inp}>
                <option value="">Select…</option>
                {(mastersByType["act_regulation"] ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Financial Year / Tax Year">
            <select value={financialYearId} onChange={(e) => handleFYChange(e.target.value)} className={inp}>
              <option value="">Select…</option>
              {(mastersByType["financial_year"] ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Assessment Year">
            <select
              value={assessmentYearId}
              onChange={(e) => setAssessmentYearId(e.target.value)}
              className={`${inp} ${ayDisabled ? "opacity-50 cursor-not-allowed bg-[#F3F4F6]" : ""}`}
              disabled={ayDisabled}
            >
              <option value="">{ayDisabled ? "Not applicable" : "Select…"}</option>
              {!ayDisabled && (mastersByType["assessment_year"] ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={appealStatus} onChange={(e) => setAppealStatus(e.target.value)} className={inp}>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>
      </section>

      {/* Section 2 */}
      <section className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1A1A2E] pb-3 border-b border-[#E5E7EB] mb-5">Proceeding</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label={`Proceeding${actRegulationId ? "" : " (select Act first)"}`}>
            <select value={proceedingTypeId} onChange={(e) => setProceedingTypeId(e.target.value)} className={inp} disabled={!actRegulationId}>
              <option value="">{actRegulationId ? "Select proceeding…" : "Select Act / Regulation first"}</option>
              {availableProceedings.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Authority Type">
            <select value={authorityType} onChange={(e) => setAuthorityType(e.target.value)} className={inp}>
              <option value="">Select…</option>
              <option value="assessing">Assessing</option>
              <option value="appellate">Appellate</option>
            </select>
          </Field>
          <Field label="Authority Name">
            <input value={authorityName} onChange={(e) => setAuthorityName(e.target.value)} placeholder="e.g. ACIT, Circle 1(1)" className={inp} />
          </Field>
          <Field label="Jurisdiction City">
            <input value={jurisdictionCity} onChange={(e) => setJurisdictionCity(e.target.value)} placeholder="e.g. Chennai" className={inp} />
          </Field>
          <div className="col-span-2">
            <Field label="Jurisdiction / Address">
              <input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="Full jurisdiction or address" className={inp} />
            </Field>
          </div>
          <Field label="Importance">
            <select value={importance} onChange={(e) => setImportance(e.target.value)} className={inp}>
              <option value="">Select…</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </Field>
          <Field label="Mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={inp}>
              <option value="">Select…</option>
              <option value="online">Online</option>
              <option value="offline">Offline / Physical</option>
            </select>
          </Field>
          <Field label="Initiated On">
            <input type="date" value={initiatedOn} onChange={(e) => setInitiatedOn(e.target.value)} className={inp} />
          </Field>
          <Field label="To Be Completed By">
            <input type="date" value={toBeCompletedBy} onChange={(e) => setToBeCompletedBy(e.target.value)} className={inp} />
          </Field>
          <Field label="Assigned To">
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inp}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
            </select>
          </Field>
          <Field label="Client Staff">
            <select value={clientStaff} onChange={(e) => setClientStaff(e.target.value)} className={inp} disabled={!clientOrgId}>
              <option value="">{clientOrgId ? "Select client contact…" : "Select client first"}</option>
              {(clientUsersByOrg[clientOrgId] ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Possible Outcome">
            <select value={possibleOutcome} onChange={(e) => setPossibleOutcome(e.target.value)} className={inp}>
              <option value="">Select…</option>
              <option value="favourable">Favourable</option>
              <option value="doubtful">Doubtful</option>
              <option value="unfavourable">Unfavourable</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={proceedingStatus} onChange={(e) => setProceedingStatus(e.target.value)} className={inp}>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.push("/litigations")}
          className="px-5 py-2.5 text-sm border border-[#E5E7EB] rounded-lg text-[#1A1A2E] hover:bg-[#F8F9FA] transition">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60">
          {saving ? "Creating…" : "Create Litigation"}
        </button>
      </div>
    </form>
  );
}
