import { Suspense } from "react";
import WordDetailClient from "./WordDetailClient";

export default function WordDetailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center pb-24 text-[var(--muted)]">불러오는 중…</main>}>
      <WordDetailClient />
    </Suspense>
  );
}
