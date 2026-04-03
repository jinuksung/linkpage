import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "핫비버의 핫딜 모음집",
  description: "Instagram DM 연동용 링크 페이지 + 백오피스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
