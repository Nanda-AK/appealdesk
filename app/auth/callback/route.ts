import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type"); // "invite" | "recovery" | "email" | null

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("exchangeCodeForSession error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "invite" | "email" | "recovery" | "email_change",
    });
    if (error) {
      console.error("verifyOtp error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }
  } else {
    // No code or token — malformed callback
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // For invites and password recovery, redirect to password setup
  if (type === "invite" || type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/setup-password`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
