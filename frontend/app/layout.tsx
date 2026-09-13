import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaniJaga – AI Farm Financial Engine for Corn Farmers",
  description: "AI-powered financial audit, HPP calculation, and cash incentives specifically for Indonesian corn farmers.",
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
