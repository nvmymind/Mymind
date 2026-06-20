"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdminWord = {
  id: string;
  displayText: string;
  text: string;
  status: string;
  reportCount: number;
  empathyCount: number;
  reportsTotal: number;
};

type AdminReport = {
  id: string;
  reason: string;
  createdAt: string;
  word: { id: string; text: string; status: string; reportCount: number };
};

export default function AdminDashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");
  const [words, setWords] = useState<AdminWord[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [filter, setFilter] = useState("HIDDEN");

  async function loadData() {
    const [wordsRes, reportsRes] = await Promise.all([
      fetch(`/api/v1/admin/words?status=${filter}`),
      fetch("/api/v1/admin/reports"),
    ]);

    if (wordsRes.status === 403) {
      setAuthed(false);
      return;
    }

    setAuthed(true);
    setWords((await wordsRes.json()).items ?? []);
    setReports((await reportsRes.json()).items ?? []);
  }

  useEffect(() => {
    void loadData();
  }, [filter]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    if (!res.ok) {
      alert("관리자 로그인 실패");
      return;
    }
    setAuthed(true);
    void loadData();
  }

  async function updateWordStatus(id: string, status: "ACTIVE" | "HIDDEN" | "PENDING_REVIEW") {
    const res = await fetch(`/api/v1/admin/words/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) void loadData();
  }

  async function handleLogout() {
    await fetch("/api/v1/admin/login", { method: "DELETE" });
    setAuthed(false);
    router.refresh();
  }

  if (authed === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center pb-24 text-[var(--muted)]">
        확인 중…
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-dvh flex-col justify-center px-6 pb-24">
        <h1 className="mb-6 text-center text-2xl font-bold">MyMind Admin</h1>
        <form onSubmit={handleLogin} className="mx-auto w-full max-w-sm space-y-4">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="ADMIN_SECRET"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
          />
          <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-3 text-white">
            관리자 로그인
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="space-y-8 px-4 py-6 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">관리자 대시보드</h1>
        <button type="button" onClick={handleLogout} className="text-sm text-[var(--muted)]">
          로그아웃
        </button>
      </header>

      <section>
        <div className="mb-3 flex gap-2">
          {(["HIDDEN", "PENDING_REVIEW", "ACTIVE"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`rounded-full px-3 py-1 text-xs ${
                filter === status ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {words.map((word) => (
            <article
              key={word.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"
            >
              <div>
                <p className="font-medium">
                  {word.displayText}{" "}
                  <span className="text-xs text-[var(--muted)]">({word.text})</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  신고 {word.reportCount} · 공감 {word.empathyCount} · 접수 {word.reportsTotal}
                </p>
              </div>
              <div className="flex gap-2">
                {word.status !== "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => updateWordStatus(word.id, "ACTIVE")}
                    className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white"
                  >
                    복구
                  </button>
                )}
                {word.status !== "HIDDEN" && (
                  <button
                    type="button"
                    onClick={() => updateWordStatus(word.id, "HIDDEN")}
                    className="rounded-lg bg-[var(--danger)] px-3 py-1 text-xs text-white"
                  >
                    비노출
                  </button>
                )}
              </div>
            </article>
          ))}
          {!words.length && <p className="text-sm text-[var(--muted)]">해당 상태의 단어가 없습니다.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">최근 신고</h2>
        <div className="space-y-2">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
            >
              <p className="font-medium">{report.word.text}</p>
              <p className="text-xs text-[var(--muted)]">
                {report.reason} · 신고 누적 {report.word.reportCount} · {new Date(report.createdAt).toLocaleString("ko-KR")}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
