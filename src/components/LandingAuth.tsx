"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AuthMode = "mock" | "nice" | "loading";

type NiceInitResponse = {
  mode: "mock" | "nice";
  message?: string;
  actionUrl?: string;
  form?: Record<string, string>;
};

export function LandingAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("loading");
  const [loading, setLoading] = useState(false);
  const [birthYear, setBirthYear] = useState(1990);
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [niceInfo, setNiceInfo] = useState<string>("");

  useEffect(() => {
    fetch("/api/v1/auth/nice/init")
      .then((r) => r.json())
      .then((data: NiceInitResponse) => {
        setMode(data.mode);
        if (data.message) setNiceInfo(data.message);
      })
      .catch(() => setMode("mock"));
  }, []);

  async function handleMockVerify() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthYear, gender }),
      });
      if (!res.ok) throw new Error("fail");
      router.push("/home");
      router.refresh();
    } catch {
      alert("본인인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleNiceVerify() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/nice/init");
      const data = (await res.json()) as NiceInitResponse;
      if (data.mode !== "nice" || !data.actionUrl || !data.form) {
        throw new Error("NICE 초기화 실패");
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.actionUrl;
      form.target = "niceAuthPopup";

      Object.entries(data.form).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      window.open("", "niceAuthPopup", "width=480,height=720");
      document.body.appendChild(form);
      form.submit();
      form.remove();
    } catch {
      alert("PASS 본인인증 창을 열지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "loading") {
    return <p className="text-center text-sm text-[var(--muted)]">인증 방식 확인 중…</p>;
  }

  return (
    <div className="space-y-4">
      {mode === "mock" ? (
        <>
          <p className="text-center text-sm text-[var(--muted)]">
            {niceInfo || "NICE API 키 미설정 — mock 본인인증을 사용합니다."}
          </p>
          <div className="space-y-2">
            <label className="block text-sm text-[var(--muted)]">출생연도</label>
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(Number(e.target.value))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-[var(--muted)]">성별</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
              <option value="OTHER">기타</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleMockVerify}
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "인증 중…" : "Mock 본인인증 (개발용)"}
          </button>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-[var(--muted)]">
            NICE CheckPlus(PASS) 본인인증이 연결되어 있습니다.
          </p>
          <button
            type="button"
            onClick={handleNiceVerify}
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "창 여는 중…" : "📱 PASS / 휴대폰 본인인증 시작"}
          </button>
        </>
      )}

      <p className="text-center text-xs text-[var(--muted)]">
        본인인증 후 성별·연령대 통계에만 활용됩니다. 실명은 공개되지 않습니다.
      </p>
      <p className="text-center text-sm">
        <Link href="/home" className="text-[var(--accent)]">
          데모로 둘러보기 →
        </Link>
      </p>
    </div>
  );
}
