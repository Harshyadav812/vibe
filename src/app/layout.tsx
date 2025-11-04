import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vibe - AI Powered Code Generation Platform",
  description: "Build full-stack applications through natural language conversations. Vibe generates working code in isolated sandboxes using AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#C96342"
        }
      }}
    >
      <TRPCReactProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <ThemeProvider
              attribute={"class"}
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Toaster />
              {children}
              <Analytics />
            </ThemeProvider>
          </body>
        </html>
      </TRPCReactProvider>
    </ClerkProvider>
  );
}
