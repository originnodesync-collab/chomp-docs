import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "쩝쩝박사들의 연구노트",
  description: "맛있는 것들의 모든 연구 기록",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
