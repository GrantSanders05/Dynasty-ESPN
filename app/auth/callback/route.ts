import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  const response = NextResponse.redirect(new URL(next, url.origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
  get(name: string) {
    // @ts-ignore
    return request.headers.get("cookie")?.match(new RegExp(`${name}=([^;]+)`))?.[1];
  },
  set(name: string, value: string, options?: Record<string, any>) {
    response.cookies.set({ name, value, ...(options ?? {}) });
  },
  remove(name: string, options?: Record<string, any>) {
    response.cookies.set({ name, value: "", ...(options ?? {}), maxAge: 0 });
  },
},
    }
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return response;
}
