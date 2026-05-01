import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { AutoSyncProvider } from "@/providers/AutoSyncProvider";
import { Analytics } from "@vercel/analytics/react";
import { auth } from "@/auth";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "CP Vertex — Competitive Programming Platform",
  description:
    "Train, compete, and master algorithms with a gamified competitive programming platform.",
  keywords: ["competitive programming", "algorithms", "training", "gamified", "codeforces"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider session={session}>
          <AutoSyncProvider />
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
