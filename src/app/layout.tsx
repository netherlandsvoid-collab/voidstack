import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import "./studio.css";
import "./polish.css";
import "./signal.css";
const manrope = localFont({
  src: "../../public/fonts/Manrope.ttf",
  display: "swap",
  variable: "--font-studio",
  weight: "200 800",
});
export const metadata: Metadata = {
  title: "Nexirel — Where ideas find their people.",
  description:
    "A home for creative minds. Share your work, find your people, and make something meaningful.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The bootstrap sets only this element's theme attribute before hydration.
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body>
        <Script id="nexirel-theme" strategy="beforeInteractive">
          {`(() => { let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; try { const saved = localStorage.getItem('nexirel-theme'); if (saved === 'dark' || saved === 'light') theme = saved; } catch {} document.documentElement.dataset.theme = theme; })();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
