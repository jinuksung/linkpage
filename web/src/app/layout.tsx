import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkPage",
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
