export type ActCategory = "IT" | "GST" | "Other";

export function getActCategory(actName: string | null | undefined): ActCategory {
  const n = actName?.toLowerCase() ?? "";
  if (n.includes("income")) return "IT";
  if (n.includes("central goods") || n.includes("gst")) return "GST";
  return "Other";
}
