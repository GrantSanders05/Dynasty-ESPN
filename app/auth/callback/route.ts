import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // If Google/Supabase returned an error, send back to login with message
  if (error) {
    const to = new URL("/login", url.origin);
    to.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(to);
  }

  // If we got a code, exchange it for a session (sets cookies)
  if (code) {
    const supabase = supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Always go to commissioner after callback
  return NextResponse.redirect(new URL("/commissioner", url.origin));
}
