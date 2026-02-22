import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/auth/callback", "/_next", "/favicon.ico", "/manifest.webmanifest"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public/static paths
  if (isPublic(pathname)) return NextResponse.next();

  // ✅ Only protect commissioner routes
  // ✅ Allow the commissioner login page to be public (or you'll loop forever)
if (pathname === "/commissioner/login") return NextResponse.next();

// ✅ Only protect commissioner routes
const isCommissionerRoute = pathname === "/commissioner" || pathname.startsWith("/commissioner/");
if (!isCommissionerRoute) return NextResponse.next();
  // Create response we can attach auth cookies to (if needed)
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {
          // Middleware can't set request cookies directly; SSR client may call this
        },
        remove() {
          // no-op
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → send to commissioner login
  if (!user) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
  // Optional: commissioner-only check via profiles.role (keep your existing logic)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "commissioner") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/commissioner/:path*"],
};
