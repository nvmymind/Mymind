import { LandingAuth } from "@/components/LandingAuth";

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col px-6 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold">MyMind</h1>
        <p className="mt-2 text-[var(--muted)]">생각을 단어로 연결하세요</p>
      </header>

      <div className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm leading-relaxed">
        <p className="mb-3 font-medium">트럼프 ── 관세 ── 전쟁 ── 미국</p>
        <p className="text-[var(--muted)]">\ 대통령</p>
        <p className="mt-4 text-[var(--muted)]">
          실시간으로 오르는 단어에 공감하고,
          <br />
          연결된 생각을 함께 탐색합니다.
        </p>
      </div>

      <LandingAuth />
    </main>
  );
}
