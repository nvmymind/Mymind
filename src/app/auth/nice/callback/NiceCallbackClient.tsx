"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NiceCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("본인인증 결과를 처리하는 중…");

  useEffect(() => {
    const tokenVersionId = searchParams.get("token_version_id");
    const encData = searchParams.get("enc_data");
    const integrityValue = searchParams.get("integrity_value");

    if (!tokenVersionId || !encData || !integrityValue) {
      setMessage("본인인증 결과가 올바르지 않습니다.");
      return;
    }

    fetch("/api/v1/auth/nice/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_version_id: tokenVersionId,
        enc_data: encData,
        integrity_value: integrityValue,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "인증 실패");
        }
        router.replace("/home");
        router.refresh();
      })
      .catch((error: Error) => {
        setMessage(error.message);
      });
  }, [router, searchParams]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 pb-24">
      <p className="text-center text-[var(--muted)]">{message}</p>
    </main>
  );
}
