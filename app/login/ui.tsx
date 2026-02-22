"use client";

export default function LoginUI() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Dynasty Hub</h1>
      <p>Commissioner sign-in only. Everyone else can browse as a guest.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <a href="/api/auth/google" style={{ padding: 12, display: "inline-block" }}>
          Continue with Google (Commissioner)
        </a>

        <a href="/" style={{ padding: 12, display: "inline-block" }}>
          Continue as Guest
        </a>
      </div>
    </main>
  );
}
