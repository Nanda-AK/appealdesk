/**
 * AppealDesk brand palette for non-CSS consumers (PDF/Excel/DOCX exports,
 * charts, emails). The CSS source of truth lives in app/globals.css (@theme);
 * keep the hex values here in sync with it.
 *
 * TaxVeteran palette — monochromatic charcoal/white scheme.
 */
export const BRAND = {
  primary: "#363636",
  primaryDark: "#2F2F2F",
  accent: "#4A4A4A",
  accentLight: "#F7F7F7",
  heading: "#111111",
  secondary: "#4A4A4A",
  muted: "#9CA3AF",
  border: "#C7C7C7",
  borderStrong: "#B0B0B0",
  tableHeader: "#D2D2D2",
  tableHeaderBorder: "#B8B8B8",
  page: "#FFFFFF",
  surfaceHover: "#F7F7F7",
  stripe: "#F7F7F7",
  // sidebar-specific
  sidebar: "#363636",
  sidebarActive: "#4A4A4A",
  sidebarMuted: "#D6D6D6",
  sidebarAvatar: "#2F2F2F",
  // semantic — unchanged across rebrands
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
