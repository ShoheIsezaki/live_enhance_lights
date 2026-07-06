import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SHOW_TITLE } from "@/lib/config";

export const metadata: Metadata = {
  title: SHOW_TITLE,
  description: "スマホがペンライトになる、ライブ演出ライティング",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
