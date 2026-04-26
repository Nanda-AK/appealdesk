import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServiceClient();
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("logo_url")
      .single();

    const logoUrl = settings?.logo_url;

    if (logoUrl) {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") ?? "image/png";
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }
  } catch {
    // fall through to default
  }

  // Default: redirect to a simple SVG favicon
  return NextResponse.redirect(new URL("/favicon-default.svg", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"));
}
