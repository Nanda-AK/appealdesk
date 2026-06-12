// lib/bulk-import/validators.ts

import type {
  ParsedClientRow,
  ParsedTeamUserRow,
  ParsedClientUserRow,
  ValidatedRow,
  ClientOrgOption,
} from "./types";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VALID_BUSINESS_TYPES = new Set([
  "Company",
  "Trust",
  "Partnership",
  "LLP",
  "Sole Proprietorship",
  "OPC",
  "HUF",
  "Individual",
  "Custom",
]);

export const BUSINESS_TYPES = [
  "Company", "Trust", "Partnership", "LLP", "Sole Proprietorship", "OPC", "HUF", "Individual", "Custom",
];

export const ROLES = ["sp_admin", "sp_staff"];
const VALID_ROLES = new Set(ROLES);

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
      return {
        row,
        status: "error",
        error: "Invalid PAN format (e.g. ABCDE1234F)",
      };

    const nameKey = row.name.trim().toLowerCase();
    if (seenNames.has(nameKey))
      return {
        row,
        status: "error",
        error: "Duplicate client name in this file",
      };

    if (seenPANs.has(pan))
      return { row, status: "error", error: "Duplicate PAN in this file" };

    seenNames.add(nameKey);
    seenPANs.add(pan);
    return {
      row: { ...row, name: row.name.trim(), pan_number: pan },
      status: "valid",
    };
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
      return {
        row,
        status: "error",
        error: "Role must be sp_admin or sp_staff",
      };

    if (seenEmails.has(email))
      return {
        row,
        status: "error",
        error: "Duplicate email in this file",
      };

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
      return {
        row,
        status: "error",
        error: "Client Organisation is required",
      };

    const email = row.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email))
      return { row, status: "error", error: "Invalid email format" };

    if (!orgNames.has(row.client_org_name.trim().toLowerCase()))
      return {
        row,
        status: "error",
        error: `Organisation "${row.client_org_name}" not found`,
      };

    if (seenEmails.has(email))
      return {
        row,
        status: "error",
        error: "Duplicate email in this file",
      };

    seenEmails.add(email);
    return { row: { ...row, email }, status: "valid" };
  });
}
