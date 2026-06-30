import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wealth Tracker",
  description: "Personal finance, stocks and savings in SEK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f3f4f6]">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-4 py-6 pb-24 sm:px-6 md:px-10 md:py-8 md:pb-8">{children}</main>
        </div>
        <MobileNav />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
