import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaniJaga – Farmer's Cost Ledger",
  description: "Farmer's Cost Ledger, BEP calculation, and receipt audit platform for Indonesian smallholder farmers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col bg-slate-50 overscroll-none">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
