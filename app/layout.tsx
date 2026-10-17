import type { Metadata } from "next";
import PWARegister from "@/components/PWARegister";
import { Geist, Geist_Mono } from "next/font/google";
import AuthGuard from "@/components/AuthGuard";
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
  title: "Doce Encanto",
  description: "Gestão Doce Encanto",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PWARegister />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}