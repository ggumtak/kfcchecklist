import type { Metadata, Viewport } from "next";

import "./globals.css";
import { AppProviders } from "@/app-providers";

export const metadata: Metadata = {
  title: "근무 체크리스트",
  description: "개인용 KFC 근무 체크리스트 PWA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "근무 체크리스트",
  },
  applicationName: "근무 체크리스트",
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/apple-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f2e7d6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
