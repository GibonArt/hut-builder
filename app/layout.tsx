import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/AuthProvider";
import { TypyKaretProvider } from "@/components/TypyKaretProvider";
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
  title: "HUT Builder | NHL 26",
  description: "Nástroj pro inventář, bonusy a optimalizaci formací v Ultimate Team.",
  appleWebApp: {
    capable: true,
    title: "HUT Builder",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
  /** Klávesnice mění výšku viewportu místo „roztažení“ stránky (moderní mobilní prohlížeče). */
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <a
          href="#obsah-aplikace"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:border focus:border-[var(--hut-focus)] focus:bg-[var(--hut-surface)] focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none"
        >
          Přeskočit na obsah
        </a>
        <AuthProvider>
          <TypyKaretProvider>
            {children}
            <Toaster theme="dark" position="top-center" richColors closeButton />
          </TypyKaretProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
