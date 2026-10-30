import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./studio.css";
import "./polish.css";
const manrope = localFont({
  src: "../../public/fonts/Manrope.ttf",
  display: "swap",
  variable: "--font-studio",
  weight: "200 800",
});
export const metadata: Metadata = {
  title: "Nexirel — Made to stand out.",
  description:
    "A home for creative minds. Share your work, find your people, and make something meaningful.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
