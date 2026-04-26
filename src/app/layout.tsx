import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopBar } from "@/components/shell/TopBar";
import { BottomNav } from "@/components/shell/BottomNav";

export const metadata: Metadata = {
  title: "pacientesYa",
  description: "Asistente clínico para guardia hospitalaria — Argentina",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>
          <TopBar />
          <main className="container py-4 pb-24 md:pb-8">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
