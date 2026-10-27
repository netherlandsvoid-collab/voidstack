import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Nexirel — A little more inspired.",
  description:
    "A home for creative minds. Share your work, find your people, and make something meaningful.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
