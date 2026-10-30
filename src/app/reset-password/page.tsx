import type { Metadata } from "next";
import ResetPassword from "@/components/ResetPassword";
export const metadata: Metadata = {
  title: "Reset your password — Nexirel",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default function ResetPasswordPage() {
  return <ResetPassword />;
}
