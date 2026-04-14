import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Always use getUser() — validates token server-side, prevents stale-cookie redirect loops
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith("/login");

  // Not logged in → redirect to login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in + on login page → route to correct home by role
  if (user && isLoginPage) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile?.is_active) {
      // Deactivated user — sign out and stay on login
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=deactivated", request.url));
    }

    const url = request.nextUrl.clone();
    const role = profile?.role;

    if (role === "super_admin" || role === "platform_admin") {
      url.pathname = "/platform/dashboard";
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Logged in — guard platform routes from non-platform users
  if (user && pathname.startsWith("/platform")) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (role !== "super_admin" && role !== "platform_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
