import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ProvenanceBanner } from "@/components/panels/ProvenanceBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rangaza",
  description:
    "A rehearsal room where a Civic Educator tests a public Announcement against simulated Kenyan Residents.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-full flex-col">
        <ProvenanceBanner />
        {children}
      </body>
    </html>
  );
}
