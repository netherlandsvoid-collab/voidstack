"use client";
import { useEffect, useRef, useState } from "react";
import { Asterisk, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { readApiResponse } from "@/lib/api-response";

export default function ResetPassword() {
  const loaded = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    // Fragment tokens never reach access logs or the Referer header.
    const hash = new URLSearchParams(window.location.hash.slice(1)).get(
      "token_hash",
    );
    setToken(hash);
    setReady(true);
    history.replaceState(null, "", "/reset-password");
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const newPassword = String(fields.get("newPassword") || "");
    const confirmPassword = String(fields.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenHash: token,
          newPassword,
          confirmPassword,
        }),
      });
      const result = await readApiResponse(response);
      form.reset();
      setToken(null);
      setMessage(result.message);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="recovery-page">
      <a href="/" className="recovery-brand">
        nexirel<span>.</span>
      </a>
      <section className="modal recovery-card" aria-labelledby="reset-heading">
        {message ? (
          <CheckCircle2 className="modal-flower" size={42} />
        ) : (
          <Asterisk className="modal-flower" size={42} aria-hidden="true" />
        )}
        <div className="eyebrow">BACK TO YOUR CREATIVE SPACE</div>
        <h1 id="reset-heading">
          {message ? "You’re all set." : "A fresh password."}
        </h1>
        {!ready ? (
          <p role="status">Opening your reset link…</p>
        ) : message ? (
          <>
            <p role="status" className="account-notice">
              {message}
            </p>
            <a className="button primary full" href="/?auth=login">
              Back to sign in <ArrowRight size={17} />
            </a>
          </>
        ) : !token ? (
          <>
            <p className="muted">
              Open the reset link from your email to choose a new password. If
              you refreshed this page or the link has expired, request another
              one.
            </p>
            <a className="button primary full" href="/?auth=recover">
              Request a reset email <ArrowRight size={17} />
            </a>
          </>
        ) : (
          <>
            <p className="muted">
              Choose a new password with at least 10 characters. You don’t need
              your old password.
            </p>
            <form onSubmit={submit}>
              <label>
                New password
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                  disabled={busy}
                />
              </label>
              <label>
                Confirm new password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                  disabled={busy}
                />
              </label>
              {error && (
                <div className="error-box" role="alert">
                  {error} <a href="/?auth=recover">Request a new link</a>
                </div>
              )}
              <button className="button primary full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={17} className="spin" /> Updating password…
                  </>
                ) : (
                  <>
                    Reset password <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
        <a className="recovery-home" href="/">
          Back to Nexirel
        </a>
      </section>
    </main>
  );
}
