/**
 * AppealDesk brand palette for non-CSS consumers (PDF/Excel/DOCX exports,
 * charts, emails). The CSS source of truth lives in app/globals.css (@theme);
 * keep the hex values here in sync with it.
 */
export const BRAND = {
  primary: "#1E3A5F",
  primaryDark: "#162D4A",
  accent: "#4A6FA5",
  accentLight: "#EEF2FF",
  heading: "#1A1A2E",
  secondary: "#6B7280",
  muted: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  tableHeader: "#D1D9E6",
  tableHeaderBorder: "#B0BDD0",
  page: "#F8F9FA",
  surfaceHover: "#F3F4F6",
  stripe: "#FAFAFA",
  success: "#16A34A",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  danger: "#DC2626",
  info: "#2563EB",
} as const;

/** "#1E3A5F" → [30, 58, 95] — for jsPDF setFillColor/setTextColor. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** "#1E3A5F" → "1E3A5F" — for docx/exceljs colors without the hash. */
export function hexPlain(hex: string): string {
  return hex.replace("#", "");
}
