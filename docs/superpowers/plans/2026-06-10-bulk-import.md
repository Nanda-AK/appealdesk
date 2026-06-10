# Bulk Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Bulk Import section to the SP Settings page allowing `sp_admin` users to upload Excel templates to create Clients, Team Users, and Client Users in batch.

**Architecture:** Client-side Excel parsing and template generation using `exceljs` (dynamic import), client-side field validation, server action for DB duplicate checks, server action for the actual import loop. The UI lives in `BulkImportClient.tsx` rendered at the bottom of the Settings page for `sp_admin` only.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript strict, `exceljs` (new dependency), Tailwind CSS v4

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| NEW | `lib/bulk-import/types.ts` | TypeScript interfaces for parsed rows and validated rows |
| NEW | `lib/bulk-import/validators.ts` | Pure client+server validation functions (no DB, no exceljs) |
| NEW | `lib/bulk-import/excel.ts` | Template generation (download) + file parsing (upload) using exceljs |
| NEW | `app/(sp)/settings/bulk-import-actions.ts` | Server actions: DB duplicate checks + import loops |
| NEW | `components/sp/BulkImportClient.tsx` | Full UI: 3 cards, upload flow, preview table, confirm |
| MOD | `app/(sp)/settings/page.tsx` | Fetch client orgs, render `BulkImportClient` for sp_admin |

---

## Task 1: Install exceljs

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
cd "/Users/nandakumar/Documents/01 Other Projects/suresh/appealdesk"
npm install exceljs
```

Expected: exceljs added to `dependencies` in package.json. No errors.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No new errors related to exceljs. (Existing type errors, if any, are pre-existing.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add exceljs for bulk import Excel generation"
```

---

## Task 2: Create shared types

**Files:**
- Create: `lib/bulk-import/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/bulk-import/types.ts

export interface ClientOrgOption {
  id: string;
  name: string;
}

export interface ParsedClientRow {
  rowNumber: number;
  name: string;
  pan_number: string;
  business_type?: string;
  date_of_incorporation?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  country?: string;
  pan_login_id?: string;
  pan_password?: string;
  gst_number?: string;
  gst_login_id?: string;
  gst_password?: string;
  tan_number?: string;
  tan_login_id?: string;
  tan_password?: string;
  aadhaar_number?: string;
  aadhaar_login_id?: string;
  aadhaar_password?: string;
}

export interface ParsedTeamUserRow {
  rowNumber: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "sp_admin" | "sp_staff";
  middle_name?: string;
  mobile_number?: string;
  date_of_birth?: string;
  department?: string;
  designation?: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;   // maps to `location` column in DB
  pin_code?: string;
  country?: string;
  pan_number?: string;
  aadhaar_number?: string; // maps to `aadhar_number` column in DB
}

export interface ParsedClientUserRow {
  rowNumber: number;
  first_name: string;
  last_name: string;
  email: string;
  client_org_name: string;
  middle_name?: string;
  mobile_number?: string;
  date_of_birth?: string;
}

export interface ValidatedRow<T> {
  row: T;
  status: "valid" | "error";
  error?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "bulk-import"
```

Expected: No output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add lib/bulk-import/types.ts
git commit -m "feat: add bulk import type definitions"
```

---

## Task 3: Create validators

**Files:**
- Create: `lib/bulk-import/validators.ts`

- [ ] **Step 1: Create the validators file**

```typescript
// lib/bulk-import/validators.ts

import type { ParsedClientRow, ParsedTeamUserRow, ParsedClientUserRow, ValidatedRow, ClientOrgOption } from "./types";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_BUSINESS_TYPES = new Set([
  "Company", "Trust", "Partnership", "LLP", "Sole Proprietorship", "OPC", "HUF", "Individual",
]);

const VALID_ROLES = new Set(["sp_admin", "sp_staff"]);

export function validateClientRows(
  rows: ParsedClientRow[]
): ValidatedRow<ParsedClientRow>[] {
  const seenNames = new Set<string>();
  const seenPANs = new Set<string>();

  return rows.map((row) => {
    if (!row.name?.trim())
      return { row, status: "error", error: "Client name is required" };

    if (!row.pan_number?.trim())
      return { row, status: "error", error: "PAN is required" };

    const pan = row.pan_number.trim().toUpperCase();
    if (!PAN_REGEX.test(pan))
      return { row, status: "error", error: "Invalid PAN format (e.g. ABCDE1234F)" };

    if (row.business_type && !VALID_BUSINESS_TYPES.has(row.business_type))
      return { row, status: "error", error: `Invalid business type: ${row.business_type}` };

    const nameKey = row.name.trim().toLowerCase();
    if (seenNames.has(nameKey))
      return { row, status: "error", error: "Duplicate client name in this file" };

    if (seenPANs.has(pan))
      return { row, status: "error", error: "Duplicate PAN in this file" };

    seenNames.add(nameKey);
    seenPANs.add(pan);
    return { row: { ...row, name: row.name.trim(), pan_number: pan }, status: "valid" };
  });
}

export function validateTeamUserRows(
  rows: ParsedTeamUserRow[]
): ValidatedRow<ParsedTeamUserRow>[] {
  const seenEmails = new Set<string>();

  return rows.map((row) => {
    if (!row.first_name?.trim())
      return { row, status: "error", error: "First name is required" };

    if (!row.last_name?.trim())
      return { row, status: "error", error: "Last name is required" };

    if (!row.email?.trim())
      return { row, status: "error", error: "Email is required" };

    if (!row.role?.trim())
      return { row, status: "error", error: "Role is required" };

    const email = row.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email))
      return { row, status: "error", error: "Invalid email format" };

    if (!VALID_ROLES.has(row.role))
      return { row, status: "error", error: "Role must be sp_admin or sp_staff" };

    if (seenEmails.has(email))
      return { row, status: "error", error: "Duplicate email in this file" };

    seenEmails.add(email);
    return { row: { ...row, email }, status: "valid" };
  });
}

export function validateClientUserRows(
  rows: ParsedClientUserRow[],
  clientOrgs: ClientOrgOption[]
): ValidatedRow<ParsedClientUserRow>[] {
  const seenEmails = new Set<string>();
  const orgNames = new Set(clientOrgs.map((o) => o.name.toLowerCase()));

  return rows.map((row) => {
    if (!row.first_name?.trim())
      return { row, status: "error", error: "First name is required" };

    if (!row.last_name?.trim())
      return { row, status: "error", error: "Last name is required" };

    if (!row.email?.trim())
      return { row, status: "error", error: "Email is required" };

    if (!row.client_org_name?.trim())
      return { row, status: "error", error: "Client Organisation is required" };

    const email = row.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email))
      return { row, status: "error", error: "Invalid email format" };

    if (!orgNames.has(row.client_org_name.trim().toLowerCase()))
      return { row, status: "error", error: `Organisation "${row.client_org_name}" not found` };

    if (seenEmails.has(email))
      return { row, status: "error", error: "Duplicate email in this file" };

    seenEmails.add(email);
    return { row: { ...row, email }, status: "valid" };
  });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "bulk-import"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add lib/bulk-import/validators.ts
git commit -m "feat: add bulk import client-side validators"
```

---

## Task 4: Create Excel utilities (template generation + file parsing)

**Files:**
- Create: `lib/bulk-import/excel.ts`

- [ ] **Step 1: Create the excel utilities file**

```typescript
// lib/bulk-import/excel.ts
// Client-only — uses browser APIs (Blob, URL.createObjectURL)

import { INDIAN_STATES } from "@/lib/constants";
import type { ClientOrgOption, ParsedClientRow, ParsedTeamUserRow, ParsedClientUserRow } from "./types";

const BUSINESS_TYPES = [
  "Company", "Trust", "Partnership", "LLP", "Sole Proprietorship", "OPC", "HUF", "Individual",
];
const ROLES = ["sp_admin", "sp_staff"];
const DATA_START_ROW = 3; // row 1 = header, row 2 = example, data starts row 3
const MAX_DATA_ROW = 502; // 500 data rows max

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getExcelJS() {
  // exceljs is CJS; .default holds the namespace under Next.js webpack interop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import("exceljs");
  return (mod.default ?? (mod as any)) as any;
}

function styleHeaderRow(row: any) {
  row.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: "FF1E3A5F" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF4A6FA5" } } };
    cell.alignment = { vertical: "middle", wrapText: false };
  });
}

function styleExampleRow(row: any) {
  row.eachCell((cell: any) => {
    cell.font = { italic: true, color: { argb: "FF9CA3AF" } };
  });
}

function addDropdownValidation(sheet: any, colIndex: number, listFormula: string) {
  for (let r = DATA_START_ROW; r <= MAX_DATA_ROW; r++) {
    sheet.getCell(r, colIndex).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [listFormula],
    };
  }
}

// Populate a hidden _Lists sheet and return cell range references for each list
function buildListsSheet(sheet: any, lists: string[][]): string[] {
  sheet.state = "hidden";
  return lists.map((list, colIdx) => {
    const colLetter = String.fromCharCode(65 + colIdx); // A, B, C…
    list.forEach((val, rowIdx) => {
      sheet.getCell(rowIdx + 1, colIdx + 1).value = val;
    });
    return `_Lists!$${colLetter}$1:$${colLetter}$${list.length}`;
  });
}

async function blobFromWorkbook(workbook: any): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getCellText(row: any, col: number): string {
  const cell = row.getCell(col);
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    const dd = String(v.getDate()).padStart(2, "0");
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${v.getFullYear()}`;
  }
  if (typeof v === "object" && "result" in v) return String((v as any).result ?? "").trim();
  if (typeof v === "object" && "richText" in v)
    return ((v as any).richText ?? []).map((r: any) => r.text ?? "").join("").trim();
  return String(v).trim();
}

// ─── Template generators ──────────────────────────────────────────────────────

export async function downloadClientTemplate(): Promise<void> {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet("Data");
  const lists = wb.addWorksheet("_Lists");

  data.columns = [
    { header: "Client Name *", key: "name", width: 30 },
    { header: "PAN Number *", key: "pan", width: 16 },
    { header: "Business Type", key: "btype", width: 22 },
    { header: "Date of Incorporation (DD/MM/YYYY)", key: "doi", width: 34 },
    { header: "Address Line 1", key: "a1", width: 30 },
    { header: "Address Line 2", key: "a2", width: 30 },
    { header: "City", key: "city", width: 18 },
    { header: "State", key: "state", width: 26 },
    { header: "PIN Code", key: "pin", width: 12 },
    { header: "Country", key: "country", width: 15 },
    { header: "PAN Login ID", key: "pl", width: 22 },
    { header: "PAN Password", key: "pp", width: 22 },
    { header: "GST Number", key: "gn", width: 18 },
    { header: "GST Login ID", key: "gl", width: 22 },
    { header: "GST Password", key: "gp", width: 22 },
    { header: "TAN Number", key: "tn", width: 16 },
    { header: "TAN Login ID", key: "tl", width: 22 },
    { header: "TAN Password", key: "tp", width: 22 },
    { header: "Aadhaar Number", key: "an", width: 18 },
    { header: "Aadhaar Login ID", key: "al", width: 22 },
    { header: "Aadhaar Password", key: "ap", width: 22 },
  ];

  styleHeaderRow(data.getRow(1));

  data.addRow({
    name: "Example: ABC Pvt Ltd",
    pan: "AABCA1234P",
    btype: "Company",
    doi: "01/04/2010",
    city: "Mumbai",
    state: "Maharashtra",
    pin: "400001",
    country: "India",
  });
  styleExampleRow(data.getRow(2));

  const [btRef, stRef] = buildListsSheet(lists, [BUSINESS_TYPES, INDIAN_STATES]);
  addDropdownValidation(data, 3, btRef);  // col 3 = Business Type
  addDropdownValidation(data, 8, stRef);  // col 8 = State

  triggerDownload(await blobFromWorkbook(wb), "appealdesk-clients-template.xlsx");
}

export async function downloadTeamUserTemplate(): Promise<void> {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet("Data");
  const lists = wb.addWorksheet("_Lists");

  data.columns = [
    { header: "First Name *", key: "fn", width: 20 },
    { header: "Last Name *", key: "ln", width: 20 },
    { header: "Email *", key: "email", width: 32 },
    { header: "Role *", key: "role", width: 14 },
    { header: "Middle Name", key: "mn", width: 18 },
    { header: "Mobile Number", key: "mob", width: 18 },
    { header: "Date of Birth (DD/MM/YYYY)", key: "dob", width: 26 },
    { header: "Department", key: "dept", width: 20 },
    { header: "Designation", key: "desig", width: 20 },
    { header: "Date of Joining (DD/MM/YYYY)", key: "doj", width: 28 },
    { header: "Date of Leaving (DD/MM/YYYY)", key: "dol", width: 28 },
    { header: "Address Line 1", key: "a1", width: 30 },
    { header: "Address Line 2", key: "a2", width: 30 },
    { header: "City", key: "city", width: 18 },
    { header: "State", key: "state", width: 26 },
    { header: "PIN Code", key: "pin", width: 12 },
    { header: "Country", key: "country", width: 15 },
    { header: "PAN Number", key: "pan", width: 15 },
    { header: "Aadhaar Number", key: "aadh", width: 18 },
  ];

  styleHeaderRow(data.getRow(1));

  data.addRow({
    fn: "John",
    ln: "Doe",
    email: "john.doe@example.com",
    role: "sp_staff",
    dept: "Tax",
    desig: "CA",
  });
  styleExampleRow(data.getRow(2));

  const [roleRef, stRef] = buildListsSheet(lists, [ROLES, INDIAN_STATES]);
  addDropdownValidation(data, 4, roleRef);   // col 4 = Role
  addDropdownValidation(data, 15, stRef);    // col 15 = State

  triggerDownload(await blobFromWorkbook(wb), "appealdesk-team-users-template.xlsx");
}

export async function downloadClientUserTemplate(clientOrgs: ClientOrgOption[]): Promise<void> {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  const data = wb.addWorksheet("Data");
  const lists = wb.addWorksheet("_Lists");

  data.columns = [
    { header: "First Name *", key: "fn", width: 20 },
    { header: "Last Name *", key: "ln", width: 20 },
    { header: "Email *", key: "email", width: 32 },
    { header: "Client Organisation *", key: "org", width: 36 },
    { header: "Middle Name", key: "mn", width: 18 },
    { header: "Mobile Number", key: "mob", width: 18 },
    { header: "Date of Birth (DD/MM/YYYY)", key: "dob", width: 26 },
  ];

  styleHeaderRow(data.getRow(1));

  data.addRow({
    fn: "Jane",
    ln: "Smith",
    email: "jane.smith@client.com",
    org: clientOrgs[0]?.name ?? "Select from dropdown",
  });
  styleExampleRow(data.getRow(2));

  const orgNames = clientOrgs.map((o) => o.name);
  const [orgRef] = buildListsSheet(lists, [orgNames]);
  addDropdownValidation(data, 4, orgRef); // col 4 = Client Organisation

  triggerDownload(await blobFromWorkbook(wb), "appealdesk-client-users-template.xlsx");
}

// ─── File parsers ─────────────────────────────────────────────────────────────

async function loadWorkbook(file: File) {
  const ExcelJS = await getExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  return wb;
}

function getDataSheet(wb: any) {
  const sheet = wb.getWorksheet("Data") ?? wb.worksheets[0];
  if (!sheet) throw new Error("Cannot find Data sheet. Use the official template.");
  return sheet;
}

export async function parseClientFile(file: File): Promise<ParsedClientRow[]> {
  const wb = await loadWorkbook(file);
  const sheet = getDataSheet(wb);
  const rows: ParsedClientRow[] = [];

  sheet.eachRow((row: any, rowNum: number) => {
    if (rowNum < 3) return; // skip header (row 1) and example row (row 2)
    const name = getCellText(row, 1);
    const pan = getCellText(row, 2);
    if (!name && !pan) return; // skip blank rows

    rows.push({
      rowNumber: rowNum,
      name,
      pan_number: pan,
      business_type: getCellText(row, 3) || undefined,
      date_of_incorporation: getCellText(row, 4) || undefined,
      address_line1: getCellText(row, 5) || undefined,
      address_line2: getCellText(row, 6) || undefined,
      city: getCellText(row, 7) || undefined,
      state: getCellText(row, 8) || undefined,
      pin_code: getCellText(row, 9) || undefined,
      country: getCellText(row, 10) || undefined,
      pan_login_id: getCellText(row, 11) || undefined,
      pan_password: getCellText(row, 12) || undefined,
      gst_number: getCellText(row, 13) || undefined,
      gst_login_id: getCellText(row, 14) || undefined,
      gst_password: getCellText(row, 15) || undefined,
      tan_number: getCellText(row, 16) || undefined,
      tan_login_id: getCellText(row, 17) || undefined,
      tan_password: getCellText(row, 18) || undefined,
      aadhaar_number: getCellText(row, 19) || undefined,
      aadhaar_login_id: getCellText(row, 20) || undefined,
      aadhaar_password: getCellText(row, 21) || undefined,
    });
  });

  return rows;
}

export async function parseTeamUserFile(file: File): Promise<ParsedTeamUserRow[]> {
  const wb = await loadWorkbook(file);
  const sheet = getDataSheet(wb);
  const rows: ParsedTeamUserRow[] = [];

  sheet.eachRow((row: any, rowNum: number) => {
    if (rowNum < 2) return;
    const first = getCellText(row, 1);
    const email = getCellText(row, 3);
    if (!first && !email) return;

    rows.push({
      rowNumber: rowNum,
      first_name: first,
      last_name: getCellText(row, 2),
      email,
      role: getCellText(row, 4) as "sp_admin" | "sp_staff",
      middle_name: getCellText(row, 5) || undefined,
      mobile_number: getCellText(row, 6) || undefined,
      date_of_birth: getCellText(row, 7) || undefined,
      department: getCellText(row, 8) || undefined,
      designation: getCellText(row, 9) || undefined,
      date_of_joining: getCellText(row, 10) || undefined,
      date_of_leaving: getCellText(row, 11) || undefined,
      address_line1: getCellText(row, 12) || undefined,
      address_line2: getCellText(row, 13) || undefined,
      city: getCellText(row, 14) || undefined,
      state: getCellText(row, 15) || undefined,
      pin_code: getCellText(row, 16) || undefined,
      country: getCellText(row, 17) || undefined,
      pan_number: getCellText(row, 18) || undefined,
      aadhaar_number: getCellText(row, 19) || undefined,
    });
  });

  return rows;
}

export async function parseClientUserFile(file: File): Promise<ParsedClientUserRow[]> {
  const wb = await loadWorkbook(file);
  const sheet = getDataSheet(wb);
  const rows: ParsedClientUserRow[] = [];

  sheet.eachRow((row: any, rowNum: number) => {
    if (rowNum < 2) return;
    const first = getCellText(row, 1);
    const email = getCellText(row, 3);
    if (!first && !email) return;

    rows.push({
      rowNumber: rowNum,
      first_name: first,
      last_name: getCellText(row, 2),
      email,
      client_org_name: getCellText(row, 4),
      middle_name: getCellText(row, 5) || undefined,
      mobile_number: getCellText(row, 6) || undefined,
      date_of_birth: getCellText(row, 7) || undefined,
    });
  });

  return rows;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "bulk-import"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add lib/bulk-import/excel.ts
git commit -m "feat: add bulk import Excel template generators and file parsers"
```

---

## Task 5: Create server actions

**Files:**
- Create: `app/(sp)/settings/bulk-import-actions.ts`

- [ ] **Step 1: Create the server actions file**

```typescript
// app/(sp)/settings/bulk-import-actions.ts
"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import type {
  ClientOrgOption,
  ParsedClientRow,
  ParsedTeamUserRow,
  ParsedClientUserRow,
  ValidatedRow,
} from "@/lib/bulk-import/types";

// ─── Template helper ───────────────────────────────────────────────────────────

export async function getClientOrgsForTemplate(): Promise<ClientOrgOption[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") return [];
  const supabase = await createClient();
  const spId = user.service_provider_id ?? user.org_id;
  const { data } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("parent_sp_id", spId!)
    .eq("type", "client")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

// ─── DB duplicate validation ───────────────────────────────────────────────────

export async function validateBulkClients(
  rows: ValidatedRow<ParsedClientRow>[]
): Promise<ValidatedRow<ParsedClientRow>[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const validRows = rows.filter((r) => r.status === "valid");
  if (validRows.length === 0) return rows;

  const supabase = await createServiceClient();
  const spId = user.service_provider_id ?? user.org_id;

  const { data: existingOrgs } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("parent_sp_id", spId!)
    .eq("type", "client")
    .is("deleted_at", null);

  const existingNames = new Set((existingOrgs ?? []).map((o) => o.name.toLowerCase()));
  const existingOrgIds = (existingOrgs ?? []).map((o) => o.id);

  let existingPANs = new Set<string>();
  if (existingOrgIds.length > 0) {
    const { data: panRows } = await supabase
      .from("compliance_details")
      .select("number")
      .eq("type", "pan")
      .in("org_id", existingOrgIds)
      .not("number", "is", null);
    existingPANs = new Set((panRows ?? []).map((p) => p.number!.toUpperCase()));
  }

  return rows.map((vr) => {
    if (vr.status === "error") return vr;
    if (existingNames.has(vr.row.name.toLowerCase()))
      return { ...vr, status: "error" as const, error: "Client name already exists" };
    if (existingPANs.has(vr.row.pan_number.toUpperCase()))
      return { ...vr, status: "error" as const, error: "PAN already registered" };
    return vr;
  });
}

export async function validateBulkTeamUsers(
  rows: ValidatedRow<ParsedTeamUserRow>[]
): Promise<ValidatedRow<ParsedTeamUserRow>[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const validRows = rows.filter((r) => r.status === "valid");
  if (validRows.length === 0) return rows;

  const supabase = await createServiceClient();
  const emails = validRows.map((r) => r.row.email.toLowerCase());

  const { data: existing } = await supabase
    .from("users")
    .select("email")
    .in("email", emails)
    .is("deleted_at", null);

  const existingEmails = new Set((existing ?? []).map((u) => u.email.toLowerCase()));

  return rows.map((vr) => {
    if (vr.status === "error") return vr;
    if (existingEmails.has(vr.row.email.toLowerCase()))
      return { ...vr, status: "error" as const, error: "Email already registered" };
    return vr;
  });
}

export async function validateBulkClientUsers(
  rows: ValidatedRow<ParsedClientUserRow>[]
): Promise<ValidatedRow<ParsedClientUserRow>[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const validRows = rows.filter((r) => r.status === "valid");
  if (validRows.length === 0) return rows;

  const supabase = await createServiceClient();
  const emails = validRows.map((r) => r.row.email.toLowerCase());

  const { data: existing } = await supabase
    .from("users")
    .select("email")
    .in("email", emails)
    .is("deleted_at", null);

  const existingEmails = new Set((existing ?? []).map((u) => u.email.toLowerCase()));

  return rows.map((vr) => {
    if (vr.status === "error") return vr;
    if (existingEmails.has(vr.row.email.toLowerCase()))
      return { ...vr, status: "error" as const, error: "Email already registered" };
    return vr;
  });
}

// ─── Import actions ────────────────────────────────────────────────────────────

export async function importBulkClients(
  rows: ParsedClientRow[]
): Promise<{ successCount: number }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");

  const supabase = await createServiceClient();
  const spId = user.service_provider_id ?? user.org_id;
  let successCount = 0;

  for (const row of rows) {
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: row.name.trim(),
        type: "client",
        parent_sp_id: spId!,
        business_type: row.business_type || null,
        date_of_incorporation: row.date_of_incorporation || null,
        address_line1: row.address_line1 || null,
        address_line2: row.address_line2 || null,
        city: row.city || null,
        state: row.state || null,
        pin_code: row.pin_code || null,
        country: row.country || "India",
        is_active: true,
      })
      .select("id")
      .single();

    if (orgErr || !org) continue;

    const complianceRows: any[] = [
      {
        org_id: org.id,
        type: "pan",
        number: row.pan_number.toUpperCase(),
        login_id: row.pan_login_id || null,
        credential: row.pan_password || null,
      },
    ];

    if (row.gst_number || row.gst_login_id || row.gst_password) {
      complianceRows.push({
        org_id: org.id,
        type: "gst",
        number: row.gst_number || null,
        login_id: row.gst_login_id || null,
        credential: row.gst_password || null,
      });
    }
    if (row.tan_number || row.tan_login_id || row.tan_password) {
      complianceRows.push({
        org_id: org.id,
        type: "tan",
        number: row.tan_number || null,
        login_id: row.tan_login_id || null,
        credential: row.tan_password || null,
      });
    }
    if (row.aadhaar_number || row.aadhaar_login_id || row.aadhaar_password) {
      complianceRows.push({
        org_id: org.id,
        type: "aadhaar",
        number: row.aadhaar_number || null,
        login_id: row.aadhaar_login_id || null,
        credential: row.aadhaar_password || null,
      });
    }

    await supabase.from("compliance_details").insert(complianceRows);
    successCount++;
  }

  if (successCount > 0) {
    await logAction(supabase, {
      actorId: user.id,
      spId: spId!,
      action: "bulk_import",
      entityType: "organization",
      entityLabel: `Bulk imported ${successCount} clients`,
    });
    revalidatePath("/clients");
  }

  return { successCount };
}

export async function importBulkTeamUsers(
  rows: ParsedTeamUserRow[],
  defaultPassword: string
): Promise<{ successCount: number }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");
  if (defaultPassword.length < 8) throw new Error("Password must be at least 8 characters");

  const supabase = await createServiceClient();
  const spId = user.service_provider_id ?? user.org_id;
  let successCount = 0;

  for (const row of rows) {
    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email: row.email.toLowerCase().trim(),
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });

    if (authErr || !created.user) continue;

    const { error: profileErr } = await supabase.from("users").insert({
      id: created.user.id,
      first_name: row.first_name.trim(),
      middle_name: row.middle_name?.trim() || null,
      last_name: row.last_name.trim(),
      email: row.email.toLowerCase().trim(),
      role: row.role,
      org_id: user.org_id!,
      mobile_country_code: "+91",
      mobile_number: row.mobile_number || null,
      date_of_birth: row.date_of_birth || null,
      department: row.department || null,
      designation: row.designation || null,
      date_of_joining: row.date_of_joining || null,
      date_of_leaving: row.date_of_leaving || null,
      address_line1: row.address_line1 || null,
      address_line2: row.address_line2 || null,
      city: row.city || null,
      pin_code: row.pin_code || null,
      location: row.state || null,         // DB column is `location`, not `state`
      country: row.country || "India",
      pan_number: row.pan_number || null,
      aadhar_number: row.aadhaar_number || null,  // DB column is `aadhar_number`
      is_active: true,
    });

    if (profileErr) {
      await supabase.auth.admin.deleteUser(created.user.id);
      continue;
    }

    successCount++;
  }

  if (successCount > 0) {
    await logAction(supabase, {
      actorId: user.id,
      spId: spId!,
      action: "bulk_import",
      entityType: "user",
      entityLabel: `Bulk imported ${successCount} team users`,
    });
    revalidatePath("/users");
  }

  return { successCount };
}

export async function importBulkClientUsers(
  rows: ParsedClientUserRow[],
  defaultPassword: string
): Promise<{ successCount: number }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "sp_admin") throw new Error("Unauthorized");
  if (defaultPassword.length < 8) throw new Error("Password must be at least 8 characters");

  const supabase = await createServiceClient();
  const spId = user.service_provider_id ?? user.org_id;

  // Resolve org names → IDs server-side (don't trust client-supplied IDs)
  const { data: clientOrgs } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("parent_sp_id", spId!)
    .eq("type", "client")
    .is("deleted_at", null)
    .eq("is_active", true);

  const orgNameToId = new Map(
    (clientOrgs ?? []).map((o) => [o.name.toLowerCase(), o.id])
  );

  let successCount = 0;

  for (const row of rows) {
    const clientOrgId = orgNameToId.get(row.client_org_name.toLowerCase());
    if (!clientOrgId) continue;

    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email: row.email.toLowerCase().trim(),
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });

    if (authErr || !created.user) continue;

    const { error: profileErr } = await supabase.from("users").insert({
      id: created.user.id,
      first_name: row.first_name.trim(),
      middle_name: row.middle_name?.trim() || null,
      last_name: row.last_name.trim(),
      email: row.email.toLowerCase().trim(),
      role: "client",
      org_id: clientOrgId,
      mobile_country_code: "+91",
      mobile_number: row.mobile_number || null,
      date_of_birth: row.date_of_birth || null,
      is_active: true,
    });

    if (profileErr) {
      await supabase.auth.admin.deleteUser(created.user.id);
      continue;
    }

    await supabase.from("user_org_memberships").insert({
      user_id: created.user.id,
      org_id: clientOrgId,
      service_provider_id: spId!,
      is_active: true,
    });

    successCount++;
  }

  if (successCount > 0) {
    await logAction(supabase, {
      actorId: user.id,
      spId: spId!,
      action: "bulk_import",
      entityType: "user",
      entityLabel: `Bulk imported ${successCount} client users`,
    });
    revalidatePath("/users");
  }

  return { successCount };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "bulk-import|settings/bulk"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add "app/(sp)/settings/bulk-import-actions.ts"
git commit -m "feat: add bulk import server actions (validate + import)"
```

---

## Task 6: Create BulkImportClient component

**Files:**
- Create: `components/sp/BulkImportClient.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/sp/BulkImportClient.tsx
"use client";

import { useState, useRef } from "react";
import type {
  ClientOrgOption,
  ParsedClientRow,
  ParsedTeamUserRow,
  ParsedClientUserRow,
  ValidatedRow,
} from "@/lib/bulk-import/types";
import {
  validateClientRows,
  validateTeamUserRows,
  validateClientUserRows,
} from "@/lib/bulk-import/validators";
import {
  validateBulkClients,
  validateBulkTeamUsers,
  validateBulkClientUsers,
  importBulkClients,
  importBulkTeamUsers,
  importBulkClientUsers,
} from "@/app/(sp)/settings/bulk-import-actions";

type ImportType = "clients" | "team_users" | "client_users";
type AnyValidatedRow =
  | ValidatedRow<ParsedClientRow>
  | ValidatedRow<ParsedTeamUserRow>
  | ValidatedRow<ParsedClientUserRow>;

const CARDS: { type: ImportType; label: string; desc: string }[] = [
  { type: "clients", label: "Clients", desc: "Import client organisations with PAN and compliance details" },
  { type: "team_users", label: "Team Users", desc: "Import sp_admin and sp_staff portal users" },
  { type: "client_users", label: "Client Users", desc: "Import client portal users linked to client organisations" },
];

const PREVIEW_COLS: Record<ImportType, { label: string; key: string }[]> = {
  clients: [
    { label: "Row", key: "rowNumber" },
    { label: "Client Name", key: "name" },
    { label: "PAN", key: "pan_number" },
    { label: "Business Type", key: "business_type" },
    { label: "City", key: "city" },
    { label: "Status", key: "__status" },
  ],
  team_users: [
    { label: "Row", key: "rowNumber" },
    { label: "First Name", key: "first_name" },
    { label: "Last Name", key: "last_name" },
    { label: "Email", key: "email" },
    { label: "Role", key: "role" },
    { label: "Status", key: "__status" },
  ],
  client_users: [
    { label: "Row", key: "rowNumber" },
    { label: "First Name", key: "first_name" },
    { label: "Last Name", key: "last_name" },
    { label: "Email", key: "email" },
    { label: "Client Org", key: "client_org_name" },
    { label: "Status", key: "__status" },
  ],
};

export default function BulkImportClient({ clientOrgs }: { clientOrgs: ClientOrgOption[] }) {
  const [activeType, setActiveType] = useState<ImportType | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AnyValidatedRow[]>([]);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const fileRefs = {
    clients: useRef<HTMLInputElement>(null),
    team_users: useRef<HTMLInputElement>(null),
    client_users: useRef<HTMLInputElement>(null),
  };

  const validCount = rows.filter((r) => r.status === "valid").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  async function handleDownload(type: ImportType) {
    const excel = await import("@/lib/bulk-import/excel");
    if (type === "clients") await excel.downloadClientTemplate();
    else if (type === "team_users") await excel.downloadTeamUserTemplate();
    else await excel.downloadClientUserTemplate(clientOrgs);
  }

  async function handleFileChange(type: ImportType, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRefs[type].current) fileRefs[type].current!.value = "";

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setActiveType(type);
      setStep("upload");
      setParseError("Please upload an .xlsx file. Use the Download Template button to get the correct format.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setActiveType(type);
      setStep("upload");
      setParseError("File must be under 5 MB.");
      return;
    }

    setActiveType(type);
    setStep("upload");
    setParseError(null);
    setLoading(true);

    try {
      const excel = await import("@/lib/bulk-import/excel");
      let validated: AnyValidatedRow[] = [];

      if (type === "clients") {
        const parsed = await excel.parseClientFile(file);
        if (parsed.length > 500) throw new Error("File has more than 500 rows. Split into smaller batches.");
        const clientValidated = validateClientRows(parsed);
        validated = await validateBulkClients(clientValidated);
      } else if (type === "team_users") {
        const parsed = await excel.parseTeamUserFile(file);
        if (parsed.length > 500) throw new Error("File has more than 500 rows.");
        const userValidated = validateTeamUserRows(parsed);
        validated = await validateBulkTeamUsers(userValidated);
      } else {
        const parsed = await excel.parseClientUserFile(file);
        if (parsed.length > 500) throw new Error("File has more than 500 rows.");
        const userValidated = validateClientUserRows(parsed, clientOrgs);
        validated = await validateBulkClientUsers(userValidated);
      }

      if (validated.length === 0) throw new Error("No data rows found. Make sure data starts from row 3.");

      setRows(validated);
      setStep("preview");
    } catch (err: any) {
      setParseError(err.message ?? "Failed to process file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (activeType !== "clients" && defaultPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwError("");
    setStep("importing");

    const validRows = rows.filter((r) => r.status === "valid").map((r) => r.row);

    try {
      let result: { successCount: number };
      if (activeType === "clients") {
        result = await importBulkClients(validRows as ParsedClientRow[]);
      } else if (activeType === "team_users") {
        result = await importBulkTeamUsers(validRows as ParsedTeamUserRow[], defaultPassword);
      } else {
        result = await importBulkClientUsers(validRows as ParsedClientUserRow[], defaultPassword);
      }
      setImportedCount(result.successCount);
      setStep("done");
    } catch (err: any) {
      setParseError(err.message ?? "Import failed. Please try again.");
      setStep("preview");
    }
  }

  function reset() {
    setActiveType(null);
    setStep("upload");
    setRows([]);
    setDefaultPassword("");
    setPwError("");
    setParseError(null);
    setImportedCount(0);
    setLoading(false);
  }

  const typeLabel = activeType === "clients" ? "clients" : "users";

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm mt-6">
      <h2 className="text-lg font-semibold text-[#1A1A2E] mb-1">Bulk Import</h2>
      <p className="text-sm text-[#6B7280] mb-6">
        Import clients and users from an Excel file. Use this during initial setup to migrate existing records.
      </p>

      {/* ── Cards (idle) ─────────────────────────────────────────────────── */}
      {!activeType && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CARDS.map(({ type, label, desc }) => (
            <div key={type} className="border border-[#E5E7EB] rounded-xl p-5 flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-[#1A1A2E] text-sm mb-1">{label}</h3>
                <p className="text-xs text-[#6B7280]">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(type)}
                className="w-full px-4 py-2 text-sm border-2 border-[#4A6FA5] text-[#1E3A5F] rounded-lg hover:bg-[#EEF2FF] transition"
              >
                ↓ Download Template
              </button>
              <label className="block w-full cursor-pointer">
                <span className="flex items-center justify-center w-full py-2 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg transition font-medium">
                  ↑ Upload File
                </span>
                <input
                  ref={fileRefs[type]}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => handleFileChange(type, e)}
                />
              </label>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {activeType && loading && (
        <div className="py-12 text-center text-sm text-[#6B7280]">Parsing and validating file…</div>
      )}

      {/* ── Upload error ──────────────────────────────────────────────────── */}
      {activeType && !loading && parseError && step === "upload" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{parseError}</p>
          <button type="button" onClick={reset} className="mt-2 text-xs text-[#1E3A5F] underline">
            ← Back
          </button>
        </div>
      )}

      {/* ── Preview ───────────────────────────────────────────────────────── */}
      {activeType && step === "preview" && !loading && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#1A1A2E]">
              <span className="text-[#16A34A]">{validCount} valid</span>
              {errorCount > 0 && <span className="text-[#DC2626] ml-3">{errorCount} errors</span>}
            </p>
            <button type="button" onClick={reset} className="text-sm text-[#6B7280] hover:text-[#1A1A2E]">
              ← Back
            </button>
          </div>

          {parseError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {parseError}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] max-h-80 overflow-y-auto">
            <table className="w-full border-collapse text-sm min-w-max">
              <thead className="sticky top-0">
                <tr className="bg-[#F3F4F6]">
                  {PREVIEW_COLS[activeType].map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left text-xs font-medium text-[#6B7280] border-b border-[#E5E7EB] whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((vr, i) => (
                  <tr
                    key={i}
                    className={vr.status === "valid" ? "bg-white" : "bg-red-50"}
                  >
                    {PREVIEW_COLS[activeType].map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-1.5 text-xs border-b border-[#F3F4F6] ${
                          vr.status === "error" ? "text-[#DC2626]" : "text-[#1A1A2E]"
                        }`}
                      >
                        {col.key === "__status" ? (
                          vr.status === "valid" ? (
                            <span className="bg-[#DCFCE7] text-[#16A34A] px-2 py-0.5 rounded-full text-xs">
                              ✓ Valid
                            </span>
                          ) : (
                            <span className="bg-[#FEE2E2] text-[#DC2626] px-2 py-0.5 rounded-full text-xs whitespace-nowrap">
                              ✗ {vr.error}
                            </span>
                          )
                        ) : (
                          String((vr.row as any)[col.key] ?? "—")
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeType !== "clients" && (
            <div className="mt-5">
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">
                Default Password <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="password"
                value={defaultPassword}
                onChange={(e) => {
                  setDefaultPassword(e.target.value);
                  setPwError("");
                }}
                placeholder="Min 8 characters — applied to all users in this batch"
                className="w-full max-w-sm px-3 py-2 text-sm border-2 border-[#4A6FA5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
              {pwError && <p className="text-xs text-[#DC2626] mt-1">{pwError}</p>}
              <p className="text-xs text-[#6B7280] mt-1">
                Users will be required to change this on first login.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 text-sm border-2 border-[#E5E7EB] text-[#6B7280] rounded-lg hover:bg-[#F8F9FA] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={validCount === 0}
              className="px-5 py-2.5 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition disabled:opacity-60"
            >
              Import {validCount} valid {typeLabel}
            </button>
          </div>
        </div>
      )}

      {/* ── Importing ─────────────────────────────────────────────────────── */}
      {activeType && step === "importing" && (
        <div className="py-12 text-center text-sm text-[#6B7280]">
          Importing… please wait, do not close this page.
        </div>
      )}

      {/* ── Done ──────────────────────────────────────────────────────────── */}
      {activeType && step === "done" && (
        <div className="py-8 text-center">
          <div className="text-[#16A34A] text-5xl mb-3">✓</div>
          <h3 className="font-semibold text-[#1A1A2E] mb-1">
            {importedCount} {typeLabel} imported successfully
          </h3>
          {errorCount > 0 && (
            <p className="text-sm text-[#6B7280] mb-4">
              {errorCount} rows were skipped due to errors. Scroll up to review them.
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-3 px-5 py-2.5 text-sm bg-[#1E3A5F] hover:bg-[#162d4a] text-white rounded-lg font-medium transition"
          >
            Import More
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "BulkImport|bulk-import"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add components/sp/BulkImportClient.tsx
git commit -m "feat: add BulkImportClient component with preview table and import flow"
```

---

## Task 7: Wire up settings page and verify end-to-end

**Files:**
- Modify: `app/(sp)/settings/page.tsx`

- [ ] **Step 1: Read the current settings page (already read — do not skip)**

Current content of `app/(sp)/settings/page.tsx` (from earlier read):
```tsx
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import SpSettingsClient from "@/components/sp/SpSettingsClient";
import SpApiSettingsClient from "@/components/sp/SpApiSettingsClient";
import { getSpApiSettings } from "@/app/(sp)/settings/actions";

export default async function SpSettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const spId = user?.service_provider_id ?? user?.org_id;

  const [{ data: org }, { data: compliance }, apiSettings] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", spId!).single(),
    supabase.from("compliance_details").select("*").eq("org_id", spId!),
    getSpApiSettings(),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Settings</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          {user?.role === "sp_admin"
            ? "Manage your organisation profile and account."
            : "View your organisation profile and manage your account."}
        </p>
      </div>
      <SpSettingsClient org={org} compliance={compliance ?? []} isAdmin={user?.role === "sp_admin"} />
      <SpApiSettingsClient initial={apiSettings} isAdmin={user?.role === "sp_admin"} />
    </div>
  );
}
```

- [ ] **Step 2: Update the page to add BulkImportClient**

Replace the entire file content with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/user";
import SpSettingsClient from "@/components/sp/SpSettingsClient";
import SpApiSettingsClient from "@/components/sp/SpApiSettingsClient";
import BulkImportClient from "@/components/sp/BulkImportClient";
import { getSpApiSettings } from "@/app/(sp)/settings/actions";
import { getClientOrgsForTemplate } from "@/app/(sp)/settings/bulk-import-actions";

export default async function SpSettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const spId = user?.service_provider_id ?? user?.org_id;
  const isAdmin = user?.role === "sp_admin";

  const [{ data: org }, { data: compliance }, apiSettings, clientOrgs] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", spId!).single(),
    supabase.from("compliance_details").select("*").eq("org_id", spId!),
    getSpApiSettings(),
    isAdmin ? getClientOrgsForTemplate() : Promise.resolve([]),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Settings</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">
          {isAdmin
            ? "Manage your organisation profile and account."
            : "View your organisation profile and manage your account."}
        </p>
      </div>
      <SpSettingsClient org={org} compliance={compliance ?? []} isAdmin={isAdmin} />
      <SpApiSettingsClient initial={apiSettings} isAdmin={isAdmin} />
      {isAdmin && <BulkImportClient clientOrgs={clientOrgs} />}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1
```

Expected: No new errors. (Pre-existing errors unrelated to this feature are acceptable.)

- [ ] **Step 4: Start dev server and open Settings**

```bash
npm run dev
```

Open `http://localhost:3000/settings` as an `sp_admin` user. Verify:
- The "Bulk Import" section appears below the API Integrations section
- Three cards visible: Clients, Team Users, Client Users
- Each card has a "Download Template" button and "Upload File" button
- Section is **not visible** when logged in as `sp_staff` or `client`

- [ ] **Step 5: Test Client template download**

Click "Download Template" on the Clients card. Open the downloaded `.xlsx` in Excel or Numbers.
Verify:
- Row 1 has headers with `*` marking mandatory fields (Client Name *, PAN Number *)
- Row 2 has example data in grey/italic
- Column C (Business Type) shows a dropdown with 8 options
- Column H (State) shows a dropdown with Indian states
- Hidden `_Lists` sheet exists with the dropdown values

- [ ] **Step 6: Test Team User template download**

Click "Download Template" on Team Users card.
Verify:
- Column D (Role) dropdown shows `sp_admin`, `sp_staff`
- Column O (State) shows Indian states dropdown

- [ ] **Step 7: Test Client User template download**

Click "Download Template" on Client Users card.
Verify:
- Column D (Client Organisation) dropdown lists the SP's active client organisations
- If SP has no clients yet, the dropdown is empty (this is acceptable — create clients first)

- [ ] **Step 8: Test file upload with validation errors**

Fill the client template with 3 rows:
- Row 3: valid (Client Name + valid PAN)
- Row 4: missing PAN
- Row 5: duplicate of row 3's PAN

Upload the file. Verify:
- Preview table shows row 3 as green (✓ Valid), rows 4 and 5 as red with correct error messages
- Header shows "1 valid · 2 errors"
- "Import 1 valid clients" button is enabled

- [ ] **Step 9: Test client import**

With the preview showing 1 valid row, click "Import 1 valid clients".
Verify:
- "Done" screen shows "1 clients imported successfully"
- Navigate to `/clients` — the new client appears in the list
- Check Supabase `compliance_details` table — a PAN row exists for the new org
- Check audit log (`/logs`) — entry reads "Bulk imported 1 clients"

- [ ] **Step 10: Test team user import**

Fill the team user template with 2 valid rows (unique emails, role = sp_staff).
Upload. Enter default password (8+ chars). Click "Import 2 valid users".
Verify:
- 2 users appear on `/users` Team tab
- Users can log in with the default password and are forced to change it on first login

- [ ] **Step 11: Test client user import**

Fill the client user template with 1 valid row using an existing client org name.
Upload. Enter default password. Click "Import 1 valid users".
Verify:
- User appears on `/users` Client Users tab, linked to the correct client org
- `user_org_memberships` row exists in Supabase for this user

- [ ] **Step 12: Test duplicate detection against DB**

Try uploading the same client file again (same PAN/name that now exists in the DB).
Verify:
- Preview marks row as error: "Client name already exists" or "PAN already registered"

- [ ] **Step 13: Commit final wiring**

```bash
git add "app/(sp)/settings/page.tsx"
git commit -m "feat: wire BulkImportClient into settings page for sp_admin"
```

---

## Verification Summary

| Check | How to verify |
|-------|--------------|
| Templates download with correct fields | Open .xlsx, inspect headers and dropdowns |
| Client User template has current SP's client list | Check dropdown in column D |
| Mandatory field validation | Upload file with empty PAN — preview shows error |
| PAN format validation | Upload file with "INVALID" as PAN — preview shows format error |
| In-file duplicate detection | Two rows with same PAN — second row shows "Duplicate PAN in this file" |
| DB duplicate detection | Re-upload same client twice — second upload marks as existing |
| Email duplicate detection | Upload user with email already in system — preview shows "Email already registered" |
| Preview table green/red split | Mix of valid and invalid rows, check colour coding |
| Import creates records | Check `/clients` and `/users` after import |
| Password forced change | New user logs in — forced to change password |
| Client user org link | Check `user_org_memberships` in Supabase |
| Audit log single batch entry | Check `/logs` — one entry per import, not per row |
| sp_admin only | Log in as sp_staff — Bulk Import section not rendered |
| 500 row limit | Upload 501-row file — rejected with error message |
| 5 MB file limit | Upload oversized file — rejected with error message |
