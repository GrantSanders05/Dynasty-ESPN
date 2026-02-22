"use client";

import { supabase } from "@/lib/supabaseClient";

export default function CommissionerLoginPage() {
  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Commissioner Sign In</h1>
      <p>Sign in with Google to access commissioner tools.</p>
      <button onClick={signIn} style={{ padding: 12 }}>
        Continue with Google
      </button>
    </main>
  );
}
