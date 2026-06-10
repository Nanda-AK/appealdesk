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
