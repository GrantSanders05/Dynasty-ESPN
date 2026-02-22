"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginUI() {
  const [status, setStatus] = useState<string>("");

  const signInGoogle = async () => {
    setStatus("Opening Google sign-in...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://dynasty-espn.vercel.app/auth/callback", 
               },
    });
    if (error) setStatus(error.message);
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Dynasty Hub</h1>
      <p>Commissioner sign-in only. Everyone else can browse as a guest.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={signInGoogle} style={{ padding: 12 }}>
          Continue with Google (Commissioner)
        </button>

        <a href="/" style={{ padding: 12, display: "inline-block" }}>
          Continue as Guest
        </a>
      </div>

      {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
    </main>
  );
}
