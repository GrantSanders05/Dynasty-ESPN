import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/api/auth/google",
  "/_next",
  "/favicon.ico",
  "/manifest.webmanifest",
];

function isPublic(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const isCommissionerRoute =
    pathname === "/commissioner" || pathname.startsWith("/commissioner/");
  if (!isCommissionerRoute) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // commissioner-only check
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
