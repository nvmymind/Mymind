import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
  title: "MyMind — 생각을 단어로 연결",
  description: "실시간으로 오르는 단어에 공감하고, 연결된 생각을 함께 탐색합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-3xl md:max-w-5xl lg:max-w-none">
          {children}
          <AppNav />
        </div>
      </body>
    </html>
  );
}
