import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const redirectTo = "https://dynasty-espn.vercel.app/auth/callback";

  const url =
    `${supabaseUrl}/auth/v1/authorize` +
    `?provider=google` +
    `&redirect_to=${encodeURIComponent(redirectTo)}`;

  return NextResponse.redirect(url);
}
