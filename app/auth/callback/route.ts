import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // If no code, just go home
  if (!code) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Exchange the code for a session (this is the missing step)
  await supabase.auth.exchangeCodeForSession(code);

  // Send user to commissioner tools after login
  return NextResponse.redirect(new URL("/commissioner", url.origin));
}
