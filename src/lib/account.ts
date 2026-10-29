import { authClient, BackendError } from "./server";
function password(value: unknown, min: number) {
  if (typeof value !== "string" || value.length < min || value.length > 128)
    throw new Error(`Use between ${min} and 128 characters for your password.`);
  return value;
}
async function verifyPassword(user: any, current: string) {
  const verified = await authClient().auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (verified.error) throw new Error("Your current password is incorrect.");
  if (verified.data.user.id !== user.id)
    throw new Error("Could not verify this account.");
}
export async function changePassword(user: any, body: any) {
  const current = password(body.currentPassword, 1);
  const next = password(body.newPassword, 10);
  if (next !== body.confirmPassword)
    throw new Error("The new passwords do not match.");
  if (current === next) throw new Error("Choose a different new password.");
  await verifyPassword(user, current);
  const { error } = await authClient().auth.updateUser({
    password: next,
    current_password: current,
  });
  if (error) throw new Error(error.message);
  return { message: "Your password has been changed." };
}
export async function changeEmail(user: any, body: any) {
  const current = password(body.currentPassword, 1);
  if (typeof body.email !== "string" || body.email.length > 254)
    throw new Error("Enter a valid email address.");
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (email === user.email?.toLowerCase())
    throw new Error("Enter a different email address.");
  let redirect: URL;
  try {
    const base = new URL(process.env.APP_URL || "");
    if (!["http:", "https:"].includes(base.protocol)) throw new Error();
    redirect = new URL("/auth/callback", base);
  } catch {
    throw new BackendError(
      "Configure APP_URL before changing your email address.",
    );
  }
  const auth = authClient().auth;
  // Email changes require the existing password as well as an active session.
  await verifyPassword(user, current);
  const { error } = await auth.updateUser(
    { email },
    { emailRedirectTo: redirect.toString() },
  );
  if (error) throw new Error(error.message);
  return {
    message:
      "Check your current and new inboxes for confirmation links. Your email changes after the required confirmations are complete.",
  };
}
