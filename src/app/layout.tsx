import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import AuthProvider from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: "--font-manrope",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "MFL - My Fitness League",
  description: "My Fitness League",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  } catch (error) {
    console.error("Session error:", error);
    // Continue with null session - user will need to login
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0F1E46" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider session={session}>{children}</AuthProvider>
          <Toaster
            position="top-center"
            richColors
            closeButton
            duration={4000}
          />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
