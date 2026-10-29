"use client";
import { useState, type FormEvent } from "react";
type Props = {
  email: string;
  api: (action: string, body: Record<string, any>) => Promise<any>;
  onUpdated: () => Promise<void>;
};
export default function AccountSettings({ email, api, onUpdated }: Props) {
  const [busy, setBusy] = useState<"" | "email" | "password">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [feedbackFor, setFeedbackFor] = useState<"email" | "password">("email");
  async function save(
    event: FormEvent<HTMLFormElement>,
    kind: "email" | "password",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setBusy(kind);
    setFeedbackFor(kind);
    setError("");
    setMessage("");
    try {
      const result = await api("account-" + kind, body);
      form.reset();
      setMessage(result.message);
      await onUpdated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update your account.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <section
      className="account-settings"
      aria-labelledby="account-settings-title"
    >
      <h3 id="account-settings-title">Account & security</h3>
      <p className="muted">Signed in as {email || "your account"}</p>
      <form onSubmit={(event) => save(event, "email")}>
        <h4>Change email</h4>
        <label>
          New email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
        <label>
          Current password to change email
          <input
            name="currentPassword"
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
          />
        </label>
        <p className="fine-print">
          Keep access to both inboxes until the change is confirmed.
        </p>
        <button className="button secondary full" disabled={!!busy}>
          {busy === "email" ? "Sending confirmation..." : "Change email"}
        </button>
        {feedbackFor === "email" && error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {feedbackFor === "email" && message && (
          <p className="account-notice" role="status">
            {message}
          </p>
        )}
      </form>
      <form onSubmit={(event) => save(event, "password")}>
        <h4>Change password</h4>
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            name="newPassword"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <button className="button secondary full" disabled={!!busy}>
          {busy === "password" ? "Updating password..." : "Change password"}
        </button>
        {feedbackFor === "password" && error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {feedbackFor === "password" && message && (
          <p className="account-notice" role="status">
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
