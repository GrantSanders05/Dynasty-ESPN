"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending"); setError(null);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <form onSubmit={sendLink} className="space-y-3">
      <label className="block text-sm font-medium">Email</label>
      <input
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        type="email"
        required
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900
                   focus:outline-none focus:ring-2 focus:ring-neutral-900/20
                   dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:ring-neutral-50/20"
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={status==="sending"}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60
                   dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {status==="sending" ? "Sending..." : "Send magic link"}
      </button>
      {status==="sent" ? (
        <p className="text-sm text-green-600 dark:text-green-400">Check your email for the sign-in link.</p>
      ) : null}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </form>
  );
}
