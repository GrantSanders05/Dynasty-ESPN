import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/", "/home", "/schedule", "/team", "/rankings", "/media", "/podcast", "/commissioner"];
const PUBLIC_PATHS = ["/login", "/auth/callback", "/invite", "/_next", "/favicon.ico", "/manifest.webmanifest"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // Only guard app routes; allow static assets
  const shouldProtect = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
  if (!shouldProtect) return NextResponse.next();

  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based guard for commissioner area
  if (pathname.startsWith("/commissioner")) {
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
  }

  // If user is authed but no profile, force invite
  const { data: profile2 } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile2) {
    const url = request.nextUrl.clone();
    url.pathname = "/invite";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)$).*)"],
};
