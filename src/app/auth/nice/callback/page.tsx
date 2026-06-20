import { Suspense } from "react";
import NiceCallbackClient from "./NiceCallbackClient";

export default function NiceCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center pb-24 text-[var(--muted)]">
          불러오는 중…
        </main>
      }
    >
      <NiceCallbackClient />
    </Suspense>
  );
}
