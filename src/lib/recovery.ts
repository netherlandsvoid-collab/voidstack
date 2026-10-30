import { authClient, BackendError } from "./server";

export async function requestPasswordReset(body: any) {
  if (typeof body.email !== "string" || body.email.length > 254)
    throw new Error("Enter a valid email address.");
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  let redirect: URL;
  try {
    const base = new URL(process.env.APP_URL || "");
    if (!["https:", "http:"].includes(base.protocol)) throw new Error();
    redirect = new URL("/reset-password", base);
  } catch {
    throw new BackendError(
      "Configure APP_URL before sending password reset emails.",
    );
  }
  const { error } = await authClient().auth.resetPasswordForEmail(email, {
    redirectTo: redirect.toString(),
  });
  // Supabase does not disclose whether the address belongs to an account.
  if (error) {
    if (error.status === 429)
      throw new Error(
        "Please wait a minute before requesting another reset email.",
      );
    throw new BackendError(
      "The reset email could not be sent. Please try again later.",
    );
  }
  return {
    message:
      "If an account uses that email, you’ll receive a password reset link. Check your inbox and spam folder.",
  };
}

export async function resetForgottenPassword(body: any) {
  if (
    typeof body.newPassword !== "string" ||
    body.newPassword.length < 10 ||
    body.newPassword.length > 128
  )
    throw new Error("Use between 10 and 128 characters for your password.");
  if (body.newPassword !== body.confirmPassword)
    throw new Error("The new passwords do not match.");
  if (
    typeof body.tokenHash !== "string" ||
    !/^[a-zA-Z0-9_-]{16,512}$/.test(body.tokenHash)
  )
    throw new Error(
      "This reset link is invalid or expired. Request a new one.",
    );
  const auth = authClient().auth;
  // Only an emailed recovery token authorizes this action. An existing signed-in
  // cookie alone cannot bypass the current-password check in account settings.
  // Verify on POST, after local validation; GET/email scanners never consume it.
  const verified = await auth.verifyOtp({
    token_hash: body.tokenHash,
    type: "recovery",
  });
  if (verified.error || !verified.data.user || !verified.data.session)
    throw new Error(
      "This reset link is invalid or expired. Request a new one.",
    );
  const { error } = await auth.updateUser({ password: body.newPassword });
  // Do not leave a recovery-created session signed in on success or failure.
  await auth.signOut({ scope: "local" });
  if (error)
    throw new Error(
      "Your password could not be changed. Request a new link and try a different password.",
    );
  return {
    message: "Your password has been reset. Sign in with your new password.",
  };
}
