import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aura Skincare — AI Voice Customer Support Specialist",
  description:
    "Real-time voice customer support agent for Aura Skincare powered by LiveKit Cloud, Google Realtime Voice AI, and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${cormorantGaramond.variable}`}>
      <body className="antialiased selection:bg-sage-200 selection:text-forest-900">
        {children}
      </body>
    </html>
  );
}
